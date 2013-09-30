echtzeit.Engine = {
        get: function(options) {
                return new echtzeit.Engine.Proxy(options);
        },
        METHODS: ['createClient', 'clientExists', 'destroyClient', 'ping', 'subscribe', 'unsubscribe']
};

echtzeit.Engine.Proxy = echtzeit.Class({
        MAX_DELAY: 0.0,
        INTERVAL: 0.0,
        TIMEOUT: 60.0,
        className: 'Engine',
        initialize: function(options) {
                this._options = options || {};
                this._connections = {};
                this.interval = this._options.interval || this.INTERVAL;
                this.timeout = this._options.timeout || this.TIMEOUT;
                var engineClass = this._options.type || echtzeit.Engine.Memory;
                this._engine = engineClass.create(this, this._options);

                this.bind('close', function(clientId) {
                        var self = this;
                        setTimeout(function() {
                                self.closeConnection(clientId)
                        }, 10);
                }, this);
                
                this.debug('Created new engine: ?', this._options);
        },
        connect: function(clientId, options, callback, context) {
                this.debug('Accepting connection from ?', clientId);
                this._engine.ping(clientId);
                var conn = this.connection(clientId, true);
                conn.connect(options, callback, context);
                this._engine.emptyQueue(clientId);
        },
        hasConnection: function(clientId) {
                return this._connections.hasOwnProperty(clientId);
        },
        connection: function(clientId, create) {
                var conn = this._connections[clientId];
                if (conn || !create) return conn;
                this._connections[clientId] = new echtzeit.Engine.Connection(this, clientId);
                this.trigger('connection:open', clientId);
                return this._connections[clientId];
        },
        closeConnection: function(clientId) {
                this.debug('Closing connection for ?', clientId);
                var conn = this._connections[clientId];
                if (!conn) return;
                if (conn.socket) conn.socket.close();
                this.trigger('connection:close', clientId);
                delete this._connections[clientId];
        },
        openSocket: function(clientId, socket) {
                var conn = this.connection(clientId, true);
                conn.socket = socket;
        },
        deliver: function(clientId, messages) {
                if (!messages || messages.length === 0) return false;
                var conn = this.connection(clientId, false);
                if (!conn) return false;
                for (var i = 0, n = messages.length; i < n; i++) {
                        conn.deliver(messages[i]);
                }
                return true;
        },
        generateId: function() {
                return echtzeit.random();
        },
        flush: function(clientId) {
                if (!clientId) return;
                this.debug('Flushing connection for ?', clientId);
                var conn = this.connection(clientId, false);
                if (conn) conn.flush(true);
        },
        disconnect: function() {
                if (this._engine.disconnect) return this._engine.disconnect();
        },
        publish: function(message) {
                var channels = echtzeit.Channel.expand(message.channel);
                return this._engine.publish(message, channels);
        }
});

echtzeit.Engine.METHODS.forEach(function(method) {
        echtzeit.Engine.Proxy.prototype[method] = function() {
                return this._engine[method].apply(this._engine, arguments);
        };
});

echtzeit.extend(echtzeit.Engine.Proxy.prototype, echtzeit.Publisher);
echtzeit.extend(echtzeit.Engine.Proxy.prototype, echtzeit.Logging);