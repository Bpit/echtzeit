echtzeit.Transport.CORS = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
                        encode: function (messages) {
                                return 'message=' + encodeURIComponent(echtzeit.toJSON(messages));
                        },
                        request: function (message, timeout) {
                                var xhrClass = echtzeit.ENV.XDomainRequest ? XDomainRequest : XMLHttpRequest,
                                        xhr = new xhrClass(),
                                        retry    = this.retry(messages, timeout),
                                        headers  = this._client.headers,
                                        self     = this,
                                        key;

                                xhr.open('POST', echtzeit.URI.stringify(this.endpoint), true);
                                
                                if (xhr.setRequestHeader) {
                                        xhr.setRequestHeader('Pragma', 'no-cache');
                                        for (key in headers)
                                                headers.hasOwnProperty(key)
                                                        && xhr.setRequestHeader(key, headers[key]);
                                }
                                
                                var cleanUp = function () {
                                        if (!xhr) return false;
                                        xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onprogress = null;
                                        xhr = null;
                                        echtzeit.ENV.clearTimeout(timer);
                                        return true;
                                };
                                xhr.onload = function () {
                                        var parsedMessage = null;
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
                                var onerror = function () {
                                        cleanUp();
                                        retry();
                                        self.trigger('down');
                                };
                                var timer = echtzeit.ENV.setTimeout(onerror, 1.5 * 1000 * timeout);
                                xhr.onerror = onerror;
                                xhr.ontimeout = onerror;
                                xhr.onprogress = function () {};
                                xhr.send(this.encode(messages));
                        }
                }), {
                isUsable: function (client, endpoint, callback, context) {
                        if (echtzeit.URI.isSameOrigin(endpoint))
                                return callback.call(context, false);
                        if (echtzeit.ENV.XDomainRequest)
                                return callback.call(context, endpoint.protocol ===
                                        echtzeit.ENV.location.protocol);
                        if (echtzeit.ENV.XMLHttpRequest) {
                                var xhr = new echtzeit.ENV.XMLHttpRequest();
                                return callback.call(context, xhr.withCredentials !== undefined);
                        }
                        return callback.call(context, false);
                }
        });
echtzeit.Transport.register('cross-origin-long-polling', echtzeit.Transport.CORS);