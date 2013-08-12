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

        request: function(messages) {
                this.callback(function() {
                        if (!this._socket) return;
                        for (var i = 0, n = messages.length; i < n; i++) this._pending.add(messages[i]);
                        this._socket.send(echtzeit.toJSON(messages));
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
                        self._socket = socket;
                        self._pending = new echtzeit.Set();
                        self._state = self.CONNECTED;
                        self._everConnected = true;
                        self._ping();
                };

                socket.onclose = socket.onerror = function() {
                        if (!socket.onclose) return;

                        var wasConnected = (self._state === self.CONNECTED);
                        socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null;

                        delete self._socket;
                        self._state = self.UNCONNECTED;
                        self.removeTimeout('ping');
                        self.setDeferredStatus('deferred');

                        if (wasConnected) {
                                if (self._pending) self._client.messageError(self._pending.toArray(), true);
                        } else if (self._everConnected) {
                                if (self._pending) self._client.messageError(self._pending.toArray());
                        } else {
                                self.setDeferredStatus('failed');
                        }
                        delete self._pending;
                };

                socket.onmessage = function(event) {
                        var messages = JSON.parse(event.data);
                        if (!messages) return;
                        messages = [].concat(messages);

                        for (var i = 0, n = messages.length; i < n; i++) {
                                if (messages[i].successful !== undefined) self._pending.remove(messages[i]);
                        }
                        self.receive(messages);
                };
        },

        close: function() {
                if (!this._socket) return;
                this._socket.close();
        },

        _createSocket: function() {
                var url     = echtzeit.Transport.WebSocket.getSocketUrl(this.endpoint),
                    options = {headers: this._client.headers, ca: this._client.ca};

                if (echtzeit.WebSocket)        return new Faye.WebSocket.Client(url, [], options);
                if (echtzeit.ENV.MozWebSocket) return new MozWebSocket(url);
                if (echtzeit.ENV.WebSocket)    return new WebSocket(url);
        },

        _ping: function() {
                if (!this._socket) return;
                this._socket.send('[]');
                this.addTimeout('ping', this._client._advice.timeout/2000, this._ping, this);
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

if (echtzeit.Event)
        echtzeit.Event.on(echtzeit.ENV, 'beforeunload', function() {
                echtzeit.Transport.WebSocket._unloaded = true;
        });