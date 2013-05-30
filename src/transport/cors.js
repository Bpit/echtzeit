echtzeit.Transport.CORS = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
            request: function(message, timeout) {
                var xhrClass = echtzeit.ENV.XDomainRequest ? XDomainRequest : XMLHttpRequest,
                    xhr = new xhrClass(),
                    retry = this.retry(message, timeout),
                    self = this;

                xhr.open('POST', this.endpoint, true);
                if (xhr.setRequestHeader) xhr.setRequestHeader('Pragma', 'no-cache');

                var cleanUp = function() {
                    if (!xhr) return false;
                    xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onprogress = null;
                    xhr = null;
                    echtzeit.ENV.clearTimeout(timer);
                    return true;
                };

                xhr.onload = function() {
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

                var onerror = function() {
                    cleanUp();
                    retry();
                    self.trigger('down');
                };
                var timer = echtzeit.ENV.setTimeout(onerror, 1.5 * 1000 * timeout);
                xhr.onerror = onerror;
                xhr.ontimeout = onerror;

                xhr.onprogress = function() {};
                xhr.send('message=' + encodeURIComponent(echtzeit.toJSON(message)));
            }
        }), {
        isUsable: function(client, endpoint, callback, context) {
            if (echtzeit.URI.parse(endpoint).isSameOrigin())
                return callback.call(context, false);

            if (echtzeit.ENV.XDomainRequest)
                return callback.call(context, echtzeit.URI.parse(endpoint).protocol ===
                    echtzeit.URI.parse(echtzeit.ENV.location).protocol);

            if (echtzeit.ENV.XMLHttpRequest) {
                var xhr = new echtzeit.ENV.XMLHttpRequest();
                return callback.call(context, xhr.withCredentials !== undefined);
            }
            return callback.call(context, false);
        }
    });

echtzeit.Transport.register('cross-origin-long-polling', echtzeit.Transport.CORS);
