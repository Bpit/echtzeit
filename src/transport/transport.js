echtzeit.Transport = echtzeit.extend(echtzeit.Class({
        MAX_DELAY: 0.0,
        batching: true,
        initialize: function(client, endpoint) {
                this._client = client;
                this.endpoint = endpoint;
                this._outbox = [];
        },
        close: function() {},
        encode: function(messages) {
                return '';
        },
        send: function(message) {
                this.debug('Client ? sending message to ?: ?',
                        this._client._clientId, echtzeit.URI.stringify(this.endpoint), message);
                if (!this.batching) return this.request([message]);

                this._outbox.push(message);

                if (message.channel === echtzeit.Channel.HANDSHAKE)
                        return this.addTimeout('publish', 0.01, this.flush, this);
                if (message.channel === echtzeit.Channel.CONNECT)
                        this._connectMessage = message;
                this.flushLargeBatch();
                this.addTimeout('publish', this.MAX_DELAY, this.flush, this);
        },
        flush: function() {
                this.removeTimeout('publish');
                if (this._outbox.length > 1 && this._connectMessage)
                        this._connectMessage.advice = {
                                timeout: 0
                        };
                this.request(this._outbox);
                this._connectMessage = null;
                this._outbox = [];
        },
        flushLargeBatch: function() {
                var string = this.encode(this._outbox);
                if (string.length < this._client.maxRequestSize) return;
                var last = this._outbox.pop();
                this.flush();
                if (last) this._outbox.push(last);
        },
        receive: function(responses) {
                responses = [].concat(responses);

                this.debug('Client ? received from ?: ?',
                        this._client._clientId, echtzeit.URI.stringify(this.endpoint), responses);
                for (var i = 0, n = responses.length; i < n; i++)
                        this._client.receiveMessage(responses[i]);
        },
        
        _getCookies: function() {
                var cookies = this._client.cookies;
                if (!cookies) return '';

                return cookies.getCookies({
                        domain: this.endpoint.hostname,
                        path: this.endpoint.path,
                        secure: this.endpoint.protocol === 'https:'
                }).toValueString();
        },

        _storeCookies: function(setCookie) {
                if (!setCookie || !this._client.cookies) return;
                setCookie = [].concat(setCookie);
                var cookie;

                for (var i = 0, n = setCookie.length; i < n; i++) {
                        cookie = this._client.cookies.setCookie(setCookie[i]);
                        cookie = cookie[0] || cookie;
                        cookie.domain = cookie.domain || this.endpoint.hostname;
                }
        }
}), {
        get: function(client, allowed, disabled, callback, context) {
                var endpoint = client.endpoint;
                echtzeit.asyncEach(this._transports, function(pair, resume) {
                        var connType = pair[0],
                                klass = pair[1],
                                connEndpoint = client.endpoints[connType] || endpoint;
                        if (echtzeit.indexOf(disabled, connType) >= 0)
                                return resume();
                        if (echtzeit.indexOf(allowed, connType) < 0) {
                                klass.isUsable(client, connEndpoint, function() {});
                                return resume();
                        }
                        klass.isUsable(client, connEndpoint, function(isUsable) {
                                if (!isUsable) return resume();
                                var transport = klass.hasOwnProperty('create') ? klass.create(client, connEndpoint) : new klass(client, connEndpoint);
                                callback.call(context, transport);
                        });
                }, function() {
                        throw new Error('Could not find a usable connection type for ' + echtzeit.URI.stringify(this.endpoint));
                });
        },
        register: function(type, klass) {
                this._transports.push([type, klass]);
                klass.prototype.connectionType = type;
        },
        _transports: []
});
echtzeit.extend(echtzeit.Transport.prototype, echtzeit.Logging);
echtzeit.extend(echtzeit.Transport.prototype, echtzeit.Timeouts);