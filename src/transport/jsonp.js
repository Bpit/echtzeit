echtzeit.Transport.JSONP = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
            shouldFlush: function(messages) {
                var params = {
                    message: echtzeit.toJSON(messages),
                    jsonp: '__jsonp' + echtzeit.Transport.JSONP._cbCount + '__'
                };
                var location = echtzeit.URI.parse(this.endpoint, params).toURL();
                return location.length >= echtzeit.Transport.MAX_URL_LENGTH;
            },

            request: function(messages, timeout) {
                var params = {
                    message: echtzeit.toJSON(messages)
                },
                    head = document.getElementsByTagName('head')[0],
                    script = document.createElement('script'),
                    callbackName = echtzeit.Transport.JSONP.getCallbackName(),
                    location = echtzeit.URI.parse(this.endpoint, params),
                    retry = this.retry(messages, timeout),
                    self = this;

                echtzeit.ENV[callbackName] = function(data) {
                    cleanUp();
                    self.receive(data);
                    self.trigger('up');
                };

                var timer = echtzeit.ENV.setTimeout(function() {
                        cleanUp();
                        retry();
                        self.trigger('down');
                    }, 1.5 * 1000 * timeout);

                var cleanUp = function() {
                    if (!echtzeit.ENV[callbackName]) return false;
                    echtzeit.ENV[callbackName] = undefined;
                    try {
                        delete echtzeit.ENV[callbackName]
                    } catch (e) {}
                    echtzeit.ENV.clearTimeout(timer);
                    script.parentNode.removeChild(script);
                    return true;
                };

                location.params.jsonp = callbackName;
                script.type = 'text/javascript';
                script.src = location.toURL();
                head.appendChild(script);
            }
        }), {
        _cbCount: 0,

        getCallbackName: function() {
            this._cbCount += 1;
            return '__jsonp' + this._cbCount + '__';
        },

        isUsable: function(client, endpoint, callback, context) {
            callback.call(context, true);
        }
    });

echtzeit.Transport.register('callback-polling', echtzeit.Transport.JSONP);
