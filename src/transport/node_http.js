echtzeit.Transport.NodeHttp = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
        encode: function(messages) {
                return echtzeit.toJSON(messages);
        },

        request: function(message) {
                var uri = this.endpoint,
                        secure = (uri.protocol === 'https:'),
                        client = secure ? https : http,
                        content = new Buffer(echtzeit.toJSON(messages), 'utf8'),
                        self = this;

                var params = this._buildParams(uri, content, secure),
                        request = client.request(params);

                request.addListener('response', function(response) {
                        self._handleResponse(response, messages);
                        self._storeCookies(response.headers['set-cookie']);
                });

                request.addListener('error', function() {
                        self._client.messageError(messages);
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

        _handleResponse: function(response, messages) {
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
                                self.receive(message);
                        else
                                self._client.messageError(messages);
                });
        }

}), {
        isUsable: function(client, endpoint, callback, context) {
                callback.call(context, echtzeit.URI.isURI(endpoint));
        }
});

echtzeit.Transport.register('long-polling', echtzeit.Transport.NodeHttp);