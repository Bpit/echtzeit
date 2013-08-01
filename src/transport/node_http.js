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

                        var cookies = this._client.cookies.getCookies({
                                        domain: uri.hostname,
                                        path: uri.pathname
                                }),
                                params = this._buildParams(uri, content, cookies, secure),
                                request = client.request(params);

                        request.addListener('response', function(response) {
                                        self._handleResponse(response, messages);
                                        self._storeCookies(uri.hostname, response.headers['set-cookie']);
                                });

                        request.addListener('error', function() {
                                        self._client.messageError(messages);
                                });
                        request.end(content);
                },

                _buildParams: function(uri, content, cookies, secure) {
                        var params = {
                                method: 'POST',
                                host: uri.hostname,
                                port: uri.port || (secure ? 443 : 80),
                                path: uri.path,
                                headers: echtzeit.extend({
                                        'Content-Length': content.length,
                                        'Content-Type': 'application/json',
                                        'Cookie': cookies.toValueString(),
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
                },

                _storeCookies: function(hostname, cookies) {
                        if (!cookies) return;
                        var cookie;

                        for (var i = 0, n = cookies.length; i < n; i++) {
                                cookie = this._client.cookies.setCookie(cookies[i]);
                                cookie = cookie[0] || cookie;
                                cookie.domain = cookie.domain || hostname;
                        }
                }

        }), {
        isUsable: function(client, endpoint, callback, context) {
                callback.call(context, echtzeit.URI.isURI(endpoint));
        }
});

echtzeit.Transport.register('long-polling', echtzeit.Transport.NodeHttp);
