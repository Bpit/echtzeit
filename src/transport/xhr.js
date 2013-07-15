echtzeit.Transport.XHR = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
                                encode: function(messages) {
                                        return echtzeit.toJSON(messages);
                                },

                                request: function(messages, timeout) {
                                        var retry = this.retry(messages, timeout),
                                        path = this.endpoint.path,
                                        self = this,
                                        xhr = echtzeit.ENV.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest();

                                xhr.open('POST', path, true);
                                xhr.setRequestHeader('Content-Type', 'application/json');
                                xhr.setRequestHeader('Pragma', 'no-cache');
                                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

                                var headers = this._client.headers;
                                for (var key in headers)
                                        headers.hasOwnProperty(key)
                                                && xhr.setRequestHeader(key, headers[key]);

                                var abort = function() {
                                        xhr.abort()
                                };
                                echtzeit.Event.on(echtzeit.ENV, 'beforeunload', abort);

                                var cleanUp = function() {
                                        echtzeit.Event.detach(echtzeit.ENV, 'beforeunload', abort);
                                        xhr.onreadystatechange = function() {};
                                        xhr = null;
                                };

                                xhr.onreadystatechange = function() {
                                        if (xhr.readyState !== 4) return;

                                        var parsedMessage = null,
                                                status = xhr.status,
                                                successful = ((status >= 200 && status < 300) ||
                                                        status === 304 ||
                                                        status === 1223);

                                        if (!successful) {
                                                cleanUp();
                                                retry();
                                                return self.trigger('down');
                                        }

                                        try {
                                                parsedMessage = JSON.parse(xhr.responseText);
                                        } catch (e) {}

                                        cleanUp();

                                        if (parsedMessage) {
                                                self.receive(parsedMessage);
                                                self.trigger('up');
                                        } else {
                                                retry();
                                                self.trigger('down');
                                        }
                                };

                                xhr.send(echtzeit.toJSON(message));
                        }
                }), {
                isUsable: function(client, endpoint, callback, context) {
                        callback.call(context, echtzeit.URI.isSameOrigin(endpoint));
                }
        });

echtzeit.Transport.register('long-polling', echtzeit.Transport.XHR);
