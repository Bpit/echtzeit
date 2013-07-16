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

        request: function(messages, timeout) {
                if (messages.length === 0) return;
                this._messages = this._messages || {};

                for (var i = 0, n = messages.length; i < n; i++) {
                        this._messages[messages[i].id] = messages[i];
                }
                this.callback(function(socket) {
                        socket && socket.send(echtzeit.toJSON(messages))
                });
                this.connect();
        },

        close: function() {
                if (!this._socket) return;
                this._socket.onclose = this._socket.onerror = null;
                this._socket.close();
                delete this._socket;
                this.setDeferredStatus('deferred');
                this._state = this.UNCONNECTED;
        },

        connect: function() {
                if (echtzeit.Transport.WebSocket._unloaded) return;

                this._state = this._state || this.UNCONNECTED;
                if (this._state !== this.UNCONNECTED) return;

                this._state = this.CONNECTING;

                var ws = echtzeit.Transport.WebSocket.getClass();
                if (!ws) return this.setDeferredStatus('failed');

                var url = echtzeit.Transport.WebSocket.getSocketUrl(this.endpoint),
                        options = {
                                headers: this._client.headers,
                                ca: this._client.ca
                        };

                this._socket = echtzeit.WebSocket ? new ws(url, [], options) : new ws(url);

                var self = this;

                this._socket.onopen = function() {
                        self._state = self.CONNECTED;
                        self._everConnected = true;
                        self.setDeferredStatus('succeeded', self._socket);
                        self.trigger('up');
                };

                this._socket.onmessage = function(event) {
                        var messages = JSON.parse(event.data);
                        if (!messages) return;
                        messages = [].concat(messages);

                        for (var i = 0, n = messages.length; i < n; i++) {
                                delete self._messages[messages[i].id];
                        }
                        self.receive(messages);
                };

                this._socket.onclose = this._socket.onerror = function() {
                        var wasConnected = (self._state === self.CONNECTED);
                        self.setDeferredStatus('deferred');
                        self._state = self.UNCONNECTED;

                        self.close();

                        if (wasConnected) return self.resend();
                        if (!self._everConnected) return self.setDeferredStatus('failed');

                        var retry = self._client.retry * 1000;
                        echtzeit.ENV.setTimeout(function() {
                                self.connect()
                        }, retry);
                        self.trigger('down');
                };
        },

        resend: function() {
                if (!this._messages) return;
                var messages = echtzeit.map(this._messages, function(id, msg) {
                        return msg
                });
                this.request(messages);
        }
}), {

        PROTOCOLS: {
                'http:': 'ws:',
                'https:': 'wss:'
        },

        getSocketUrl: function(endpoint) {
                endpoint = echtzeit.copyObject(endpoint);
                endpoint.protocol = this.PROTOCOLS[endpoint.protocol];
                return echtzeit.URI.stringify(endpoint);
        },

        getClass: function() {
                return (echtzeit.WebSocket && echtzeit.WebSocket.Client) ||
                        echtzeit.ENV.WebSocket ||
                        echtzeit.ENV.MozWebSocket;
        },

        isUsable: function(client, endpoint, callback, context) {
                this.create(client, endpoint).isUsable(callback, context);
        },

        create: function(client, endpoint) {
                var sockets = client.transports.websocket = client.transports.websocket || {};
                sockets[endpoint.href] = sockets[endpoint.href] || new this(client, endpoint);
                return sockets[endpoint.href];
        }
});

echtzeit.extend(echtzeit.Transport.WebSocket.prototype, echtzeit.Deferrable);
echtzeit.Transport.register('websocket', echtzeit.Transport.WebSocket);

if (echtzeit.Event)
        echtzeit.Event.on(echtzeit.ENV, 'beforeunload', function() {
                echtzeit.Transport.WebSocket._unloaded = true;
        });