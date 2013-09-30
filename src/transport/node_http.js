echtzeit.Transport.NodeHttp = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
        encode: function(envelopes) {
                var messages = echtzeit.map(envelopes, function(e) {
                        return e.message
                });

                return echtzeit.toJSON(messages);
        },

        request: function(envelopes) {
                var uri = this.endpoint,
                        secure = (uri.protocol === 'https:'),
                        client = secure ? https : http,
                        content = new Buffer(this.encode(envelopes), 'utf8'),
                        self = this;

                var params = this._buildParams(uri, content, secure),
                        request = client.request(params);

                request.addListener('response', function(response) {
                        self._handleResponse(response, envelopes);
                        self._storeCookies(response.headers['set-cookie']);
                });

                request.addListener('error', function() {
                        self.handleError(envelopes);
                });
                request.end(content);
        },

        _buildParams: function(uri, content, secure) {
                var params = {
                        method: 'POST',
                        host: uri.hostname,
                        port: uri.port || (secure ? 443 : 80),
                        path: uri.path,
                        headers: echtzeit.extend({
                                'Content-Length': content.length,
                                'Content-Type': 'application/json',
                                'Cookie': this._getCookies(),
                                'Host': uri.host
                        }, this._client.headers)
                };
                if (this._client.ca) params.ca = this._client.ca;
                return params;
        },

        _handleResponse: function(response, envelopes) {
                var message = null,
                        body = '',
                        self = this;

                response.setEncoding('utf8');
                response.addListener('data', function(chunk) {
                        body += chunk
                });
                response.addListener('end', function() {
                        try {
                                message = JSON.parse(body);
                        } catch (e) {}

                        if (message)
                                self.receive(envelopes, message);
                        else
                                self.handleError(envelopes);
                });
        }

}), {
        isUsable: function(client, endpoint, callback, context) {
                callback.call(context, echtzeit.URI.isURI(endpoint));
        }
});

echtzeit.Transport.register('long-polling', echtzeit.Transport.NodeHttp);