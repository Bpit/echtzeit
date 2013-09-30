echtzeit.Transport.JSONP = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
        encode: function(envelopes) {
                var messages = echtzeit.map(envelopes, function(e) {
                        return e.message
                });

                var url = echtzeit.copyObject(this.endpoint);
                url.query.message = echtzeit.toJSON(messages);
                url.query.jsonp = '__jsonp' + echtzeit.Transport.JSONP._cbCount + '__';
                return echtzeit.URI.stringify(url);
        },
        request: function(envelopes) {
                var messages = echtzeit.map(envelopes, function(e) {
                        return e.message
                }),     head = document.getElementsByTagName('head')[0],
                        script = document.createElement('script'),
                        callbackName = echtzeit.Transport.JSONP.getCallbackName(),
                        endpoint = echtzeit.copyObject(this.endpoint),
                        self = this;

                endpoint.query.message = echtzeit.toJSON(messages);
                endpoint.query.jsonp = callbackName;

                echtzeit.ENV[callbackName] = function(data) {
                        if (!echtzeit.ENV[callbackName]) return false;
                        echtzeit.ENV[callbackName] = undefined;
                        try {
                                delete echtzeit.ENV[callbackName]
                        } catch (e) {}
                        script.parentNode.removeChild(script);
                        self.receive(envelopes, data);
                };

                script.type = 'text/javascript';
                script.src = echtzeit.URI.stringify(endpoint);
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