echtzeit.Transport.WebSocket = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
        UNCONNECTED: 1,
        CONNECTING: 2,
        CONNECTED: 3,

        batching: false,

        isUsable: function(callback, context) {
                this.callback(function() {
                        callback.call(context, true)
                });
                this.errback(function() {
                        callback.call(context, false)
                });
                this.connect();
        },

        request: function(envelopes) {
                this._pending = this._pending || new echtzeit.Set();
                for (var i = 0, n = envelopes.length; i < n; i++) this._pending.add(envelopes[i]);

                this.callback(function(socket) {
                        if (!socket) return;

                        var messages = echtzeit.map(envelopes, function(e) {
                                return e.message
                        });
                        
                        socket.send(echtzeit.toJSON(messages));
                }, this);
                this.connect();
        },

        connect: function() {
                if (echtzeit.Transport.WebSocket._unloaded) return;

                this._state = this._state || this.UNCONNECTED;
                if (this._state !== this.UNCONNECTED) return;
                this._state = this.CONNECTING;

                var socket = this._createSocket();
                if (!socket) return this.setDeferredStatus('failed');

                var self = this;

                socket.onopen = function() {
                        if (socket.headers) self._storeCookies(socket.headers['set-cookie']);
                        self._socket = socket;
                        self._state = self.CONNECTED;
                        self._everConnected = true;
                        self._ping();
                        self.setDeferredStatus('succeeded', socket);
                };

                var closed = false;
                socket.onclose = socket.onerror = function() {
                        if (closed) return;
                        closed = true;

                        var wasConnected = (self._state === self.CONNECTED);
                        socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null;

                        delete self._socket;
                        self._state = self.UNCONNECTED;
                        self.removeTimeout('ping');
                        self.setDeferredStatus('unknown');

                        var pending = self._pending ? self._pending.toArray() : [];
                        delete self._pending;

                        if (wasConnected) {
                                self.handleError(pending, true);
                        } else if (self._everConnected) {
                                self.handleError(pending);
                        } else {
                                self.setDeferredStatus('failed');
                        }
                        delete self._pending;
                };

                socket.onmessage = function(event) {
                        var messages = JSON.parse(event.data),
                                envelopes = [],
                                envelope;

                        if (!messages)
                                return void 0;

                        messages = [].concat(messages);

                        for (var i = 0, n = messages.length; i < n; i++) {
                                if (messages[i].successful === undefined)
                                        continue;

                                envelope = self._pending.remove(messages[i]);

                                if (envelope) envelopes.push(envelope);
                        }

                        self.receive(envelopes, messages);
                };
        },

        close: function() {
                if (!this._socket) return;
                this._socket.close();
        },

        _createSocket: function() {
                var url = echtzeit.Transport.WebSocket.getSocketUrl(this.endpoint),
                        options = {headers: echtzeit.copyObject(this._client.headers), ca: this._client.ca};

                options.headers['Cookie'] = this._getCookies();

                if (echtzeit.WebSocket) return new echtzeit.WebSocket.Client(url, [], options);
                if (echtzeit.ENV.MozWebSocket) return new MozWebSocket(url);
                if (echtzeit.ENV.WebSocket) return new WebSocket(url);
        },

        _ping: function() {
                if (!this._socket) return;
                this._socket.send('[]');
                this.addTimeout('ping', this._client._advice.timeout / 2000, this._ping, this);
        }

}), {
        PROTOCOLS: {
                'http:': 'ws:',
                'https:': 'wss:'
        },

        create: function(client, endpoint) {
                var sockets = client.transports.websocket = client.transports.websocket || {};
                sockets[endpoint.href] = sockets[endpoint.href] || new this(client, endpoint);
                return sockets[endpoint.href];
        },

        getSocketUrl: function(endpoint) {
                endpoint = echtzeit.copyObject(endpoint);
                endpoint.protocol = this.PROTOCOLS[endpoint.protocol];
                return echtzeit.URI.stringify(endpoint);
        },

        isUsable: function(client, endpoint, callback, context) {
                this.create(client, endpoint).isUsable(callback, context);
        }
});

echtzeit.extend(echtzeit.Transport.WebSocket.prototype, echtzeit.Deferrable);
echtzeit.Transport.register('websocket', echtzeit.Transport.WebSocket);

if (echtzeit.Event && echtzeit.ENV.onbeforeunload)
        echtzeit.Event.on(echtzeit.ENV, 'beforeunload', function() {
                echtzeit.Transport.WebSocket._unloaded = true;
        });