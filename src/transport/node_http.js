echtzeit.Transport.NodeHttp = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
                        request: function(message, timeout) {
                                var uri = url.parse(this.endpoint),
                                        secure = (uri.protocol === 'https:'),
                                        client = secure ? https : http,
                                        content = new Buffer(JSON.stringify(message), 'utf8'),
                                        retry = this.retry(message, timeout),
                                        self = this;

                                var cookies = this.cookies.getCookies({
                                                domain: uri.hostname,
                                                path: uri.pathname
                                        }),
                                        params = this._buildParams(uri, content, cookies, secure),
                                        request = client.request(params);

                                request.addListener('response', function(response) {
                                                self._handleResponse(response, retry);
                                                self._storeCookies(uri.hostname, response.headers['set-cookie']);
                                        });

                                request.addListener('error', function() {
                                                retry();
                                                self.trigger('down');
                                        });
                                request.write(content);
                                request.end();
                        },

                        _buildParams: function(uri, content, cookies, secure) {
                                var params = {
                                        method: 'POST',
                                        host: uri.hostname,
                                        port: uri.port || (secure ? 443 : 80),
                                        path: uri.pathname,
                                        headers: echtzeit.extend({
                                                        'Content-Length': content.length,
                                                        'Content-Type': 'application/json',
                                                        'Cookie': cookies.toValueString(),
                                                        'Host': uri.hostname
                                                }, this.headers)
                                };
                                if (this.ca) params.ca = this.ca;
                                return params;
                        },

                        _handleResponse: function(response, retry) {
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

                                        if (message) {
                                                self.receive(message);
                                                self.trigger('up');
                                        } else {
                                                retry();
                                                self.trigger('down');
                                        }
                                });
                        },

                        _storeCookies: function(hostname, cookies) {
                                if (!cookies) return;
                                var cookie;

                                for (var i = 0, n = cookies.length; i < n; i++) {
                                        cookie = this.cookies.setCookie(cookies[i]);
                                        cookie = cookie[0] || cookie;
                                        cookie.domain = cookie.domain || hostname;
                                }
                        }

                }), {
                isUsable: function(client, endpoint, callback, context) {
                        callback.call(context, v.constructor === String);
                }
        });

echtzeit.Transport.register('long-polling', echtzeit.Transport.NodeHttp);