echtzeit.Transport.XHR = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
        encode: function(envelopes) {
                var messages = echtzeit.map(envelopes, function(e) {
                        return e.message
                });

                return echtzeit.toJSON(messages);
        },

        request: function(envelopes) {
                var path = this.endpoint.path,
                        xhr = echtzeit.ENV.ActiveXObject ? new ActiveXObject('Microsoft.XMLHTTP') : new XMLHttpRequest(),
                        self = this;

                xhr.open('POST', path, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('Pragma', 'no-cache');
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

                var headers = this._client.headers;
                for (var key in headers) {
                        if (!headers.hasOwnProperty(key)) continue;
                        xhr.setRequestHeader(key, headers[key]);
                }

                var abort = function() {
                        xhr.abort()
                };

                if (echtzeit.ENV.onbeforeunload)
                        echtzeit.Event.on(echtzeit.ENV, 'beforeunload', abort);

                xhr.onreadystatechange = function() {
                        if (!xhr || xhr.readyState !== 4) return;

                        var parsedMessage = null,
                                status = xhr.status,
                                text = xhr.responseText,
                                successful = (status >= 200 && status < 300) || status === 304 || status === 1223;

                        if (echtzeit.ENV.onbeforeunload)
                                echtzeit.Event.detach(echtzeit.ENV, 'beforeunload', abort);

                        xhr.onreadystatechange = function() {};
                        xhr = null;

                        if (!successful)
                                return self.handleError(envelopes);

                        try {
                                parsedMessage = JSON.parse(text);
                        } catch (e) {}

                        if (parsedMessage)
                                self.receive(envelopes, parsedMessage);
                        else
                                self.handleError(envelopes);
                };

                xhr.send(this.encode(envelopes));
        }
}), {
        isUsable: function(client, endpoint, callback, context) {
                callback.call(context, echtzeit.URI.isSameOrigin(endpoint));
        }
});

echtzeit.Transport.register('long-polling', echtzeit.Transport.XHR);