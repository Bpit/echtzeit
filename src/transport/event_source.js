echtzeit.Transport.EventSource = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
                        initialize: function(client, endpoint) {
                                echtzeit.Transport.prototype.initialize.call(this, client, endpoint);
                                if (!echtzeit.ENV.EventSource) return this.setDeferredStatus('failed');

                                this._xhr = new echtzeit.Transport.XHR(client, endpoint);

                                var socket = new EventSource(endpoint + '/' + client._clientId),
                                        self = this;

                                socket.onopen = function() {
                                        self._everConnected = true;
                                        self.setDeferredStatus('succeeded');
                                        self.trigger('up');
                                };

                                socket.onerror = function() {
                                        if (self._everConnected) {
                                                self.trigger('down');
                                        } else {
                                                self.setDeferredStatus('failed');
                                                socket.close();
                                        }
                                };

                                socket.onmessage = function(event) {
                                        self.receive(JSON.parse(event.data));
                                        self.trigger('up');
                                };

                                this._socket = socket;
                        },

                        isUsable: function(callback, context) {
                                this.callback(function() {
                                                callback.call(context, true)
                                        });
                                this.errback(function() {
                                                callback.call(context, false)
                                        });
                        },

                        request: function(message, timeout) {
                                this._xhr.request(message, timeout);
                        },

                        close: function() {
                                if (!this._socket) return;
                                this._socket.onerror = null;
                                this._socket.close();
                                delete this._socket;
                        }
                }), {
                isUsable: function(client, endpoint, callback, context) {
                        var id = client._clientId;
                        if (!id) return callback.call(context, false);

                        echtzeit.Transport.XHR.isUsable(client, endpoint, function(usable) {
                                        if (!usable) return callback.call(context, false);
                                        this.create(client, endpoint).isUsable(callback, context);
                                }, this);
                },

                create: function(client, endpoint) {
                        var sockets = client.transports.eventsource = client.transports.eventsource || {},
                                id = client._clientId,
                                endpoint = endpoint + '/' + (id || '');

                        sockets[endpoint] = sockets[endpoint] || new this(client, endpoint);
                        return sockets[endpoint];
                }
        });

echtzeit.extend(echtzeit.Transport.EventSource.prototype, echtzeit.Deferrable);
echtzeit.Transport.register('eventsource', echtzeit.Transport.EventSource);
