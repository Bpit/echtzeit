echtzeit.Transport.CORS = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
                encode: function(envelopes) {
                        var messages = echtzeit.map(envelopes, function(e) {
                                return e.message
                        });
                
                        return 'message=' + encodeURIComponent(echtzeit.toJSON(messages));
                },
                request: function(envelopes) {
                        var xhrClass = echtzeit.ENV.XDomainRequest ? XDomainRequest : XMLHttpRequest,
                                xhr = new xhrClass(),
                                headers = this._client.headers,
                                self = this,
                                key;

                        xhr.open('POST', echtzeit.URI.stringify(this.endpoint), true);

                        if (xhr.setRequestHeader) {
                                xhr.setRequestHeader('Pragma', 'no-cache');
                                for (key in headers) {
                                        if (!headers.hasOwnProperty(key)) continue;
                                        xhr.setRequestHeader(key, headers[key]);
                                }
                        }

                        var cleanUp = function() {
                                if (!xhr) return false;
                                xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onprogress = null;
                                xhr = null;
                        };

                        xhr.onload = function() {
                                var parsedMessage = null;
                                try {
                                        parsedMessage = JSON.parse(xhr.responseText);
                                } catch (e) {}

                                cleanUp();

                                if (parsedMessage)
                                        self.receive(envelopes, parsedMessage);
                                else
                                        self.handleError(envelopes);
                        };

                        xhr.onerror = xhr.ontimeout = function() {
                                cleanUp();
                                self.handleError(envelopes);
                        };

                        xhr.onprogress = function() {};
                        xhr.send(this.encode(envelopes));
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