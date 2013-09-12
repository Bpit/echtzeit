var crypto = require('crypto'),
        fs = require('fs'),
        http = require('http'),
        https = require('https'),
        net = require('net'),
        path = require('path'),
        tls = require('tls'),
        url = require('url'),
        querystring = require('querystring');
echtzeit.WebSocket = require('faye-websocket');
echtzeit.EventSource = echtzeit.WebSocket.EventSource;
echtzeit.CookieJar = require('cookiejar').CookieJar;
echtzeit.withDataFor = function(transport, callback, context) {
        var data = '';
        transport.setEncoding('utf8');
        transport.on('data', function(chunk) {
                data += chunk
        });
        transport.on('end', function() {
                callback.call(context, data);
        });
};
echtzeit.NodeAdapter = echtzeit.Class({
        DEFAULT_ENDPOINT: '/bayeux',
        SCRIPT_PATH: 'echtzeit.client.js',
        TYPE_JSON: {
                'Content-Type': 'application/json; charset=utf-8'
        },
        TYPE_SCRIPT: {
                'Content-Type': 'text/javascript; charset=utf-8'
        },
        TYPE_TEXT: {
                'Content-Type': 'text/plain; charset=utf-8'
        },
        initialize: function(options) {
                this._options = options || {};
                this._origins    = this._options.origins && [].concat(this._options.origins);
                this._endpoint = this._options.mount || this.DEFAULT_ENDPOINT;
                this._endpointRe = new RegExp('^' + this._endpoint.replace(/\/$/, '') + '(/[^/]*)*(\\.[^\\.]+)?$');
                this._server = new echtzeit.Server(this._options);
                this._static = new echtzeit.StaticServer(path.dirname(__filename) + '/client', /\.(?:js|map)$/);
                this._static.map(path.basename(this._endpoint) + '.js', this.SCRIPT_PATH);
                this._static.map('client.js', this.SCRIPT_PATH);
                var extensions = this._options.extensions;
                if (!extensions) return;
                extensions = [].concat(extensions);
                for (var i = 0, n = extensions.length; i < n; i++)
                        this.addExtension(extensions[i]);
        },
        addExtension: function(extension) {
                return this._server.addExtension(extension);
        },
        removeExtension: function(extension) {
                return this._server.removeExtension(extension);
        },
        getClient: function() {
                return this._client = this._client || new echtzeit.Client(this._server);
        },
        attach: function(httpServer) {
                this._overrideListeners(httpServer, 'request', 'handle');
                this._overrideListeners(httpServer, 'upgrade', 'handleUpgrade');
        },
        _overrideListeners: function(httpServer, event, method) {
                var listeners = httpServer.listeners(event),
                        self = this;
                httpServer.removeAllListeners(event);
                httpServer.on(event, function(request) {
                        if (self.check(request)) return self[method].apply(self, arguments);
                        for (var i = 0, n = listeners.length; i < n; i++)
                                listeners[i].apply(this, arguments);
                });
        },
        check: function(request) {
                var path = url.parse(request.url, true).pathname;
                return !!this._endpointRe.test(path);
        },
        handle: function(request, response) {
                var requestUrl = url.parse(request.url, true),
                        requestMethod = request.method,
                        origin        = request.headers.origin,
                        self = this;

                request.on('error', function(error) {
                        self._returnError(response, error)
                });

                response.on('error', function(error) {
                        self._returnError(null, error)
                });

                if (this._static.test(requestUrl.pathname))
                        return this._static.call(request, response);

                if (this._origins && this._origins.filter(function(o) { return o.test ? o.test(origin) : o === origin }).length === 0) {
                        response.writeHead(403, this.TYPE_TEXT);
                        response.end('Forbidden: request origin is not authorized');
                }

                if (requestMethod === 'OPTIONS' || request.headers['access-control-request-method'] === 'POST')
                        return this._handleOptions(response);

                if (echtzeit.EventSource.isEventSource(request))
                        return this.handleEventSource(request, response);

                if (requestMethod === 'GET')
                        return this._callWithParams(request, response, requestUrl.query);

                if (requestMethod === 'POST')
                        return echtzeit.withDataFor(request, function(data) {
                                var type = (request.headers['content-type'] || '').split(';')[0],
                                        params = (type === 'application/json') ? {
                                                message: data
                                        } : querystring.parse(data);
                                request.body = data;
                                self._callWithParams(request, response, params);
                        });

                this._returnError(response, {
                        message: 'Unrecognized request type'
                });
        },
        _callWithParams: function(request, response, params) {
                if (!params.message)
                        return this._returnError(response, {
                                message: 'Received request with no message: ' + this._formatRequest(request)
                        });
                try {
                        this.debug('Received message via HTTP ' + request.method + ': ?', params.message);
                        var message = JSON.parse(params.message),
                                jsonp = params.jsonp || echtzeit.JSONP_CALLBACK,
                                isGet = (request.method === 'GET'),
                                type = isGet ? this.TYPE_SCRIPT : this.TYPE_JSON,
                                headers = echtzeit.extend({}, type),
                                origin = request.headers.origin;
                        if (isGet) this._server.flushConnection(message);
                        if (origin) headers['Access-Control-Allow-Origin'] = origin;
                        headers['Cache-Control'] = 'no-cache, no-store';
                        this._server.process(message, false, function(replies) {
                                var body = JSON.stringify(replies);
                                if (isGet) body = jsonp + '(' + body.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + ');';
                                headers['Content-Length'] = new Buffer(body, 'utf8').length.toString();
                                headers['Connection'] = 'close';
                                this.debug('HTTP response: ?', body);
                                response.writeHead(200, headers);
                                response.end(body);
                        }, this);
                } catch (error) {
                        this._returnError(response, error);
                }
        },
        handleUpgrade: function(request, socket, head) {
                var ws = new echtzeit.WebSocket(request, socket, head, null, {
                        ping: this._options.ping
                }),
                        clientId = null,
                        self = this;

                ws.onmessage = function(event) {
                        try {
                                self.debug('Received message via WebSocket[' + ws.version + ']: ?', event.data);

                                var message = JSON.parse(event.data),
                                        cid = echtzeit.clientIdFromMessages(message);

                                if (clientId && cid && cid !== clientId) self._server.closeSocket(clientId);
                                self._server.openSocket(cid, ws);
                                clientId = cid;

                                self._server.process(message, false, function(replies) {
                                        if (ws) ws.send(echtzeit.toJSON(replies));
                                });
                        } catch (e) {
                                self.error(e.message + '\nBacktrace:\n' + e.stack);
                        }
                };

                ws.onclose = function(event) {
                        self._server.closeSocket(clientId);
                        ws = null;
                };
        },
        handleEventSource: function(request, response) {
                var es = new echtzeit.EventSource(request, response, {
                        ping: this._options.ping
                }),
                        clientId = es.url.split('/').pop(),
                        self = this;
                this.debug('Opened EventSource connection for ?', clientId);
                this._server.openSocket(clientId, es);
                es.onclose = function(event) {
                        self._server.closeSocket(clientId);
                        es = null;
                };
        },
        _handleOptions: function(response) {
                var headers = {
                        'Access-Control-Allow-Origin':          '*',
                        'Access-Control-Allow-Credentials':     'false',
                        'Access-Control-Allow-Headers':         'Accept, Content-Type, Pragma, X-Requested-With',
                        'Access-Control-Allow-Methods':         'POST, GET, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Origin':          '*',
                        'Access-Control-Max-Age':               '86400'
                };
                response.writeHead(200, headers);
                response.end('');
        },
        _formatRequest: function(request) {
                var method = request.method.toUpperCase(),
                        string = 'curl -X ' + method;
                string += " 'http://" + request.headers.host + request.url + "'";
                if (method === 'POST') {
                        string += " -H 'Content-Type: " + request.headers['content-type'] + "'";
                        string += " -d '" + request.body + "'";
                }
                return string;
        },
        _returnError: function(response, error) {
                var message = error.message;
                if (error.stack) message += '\nBacktrace:\n' + error.stack;
                this.error(message);
                if (!response) return;
                response.writeHead(400, this.TYPE_TEXT);
                response.end('Bad request');
        }
});

for (var method in echtzeit.Publisher) (function(method) {
        echtzeit.NodeAdapter.prototype[method] = function() {
                return this._server._engine[method].apply(this._server._engine, arguments);
        };
})(method);

echtzeit.extend(echtzeit.NodeAdapter.prototype, echtzeit.Logging);