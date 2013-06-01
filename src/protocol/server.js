echtzeit.Server = echtzeit.Class({
                META_METHODS: ["handshake", "connect", "disconnect", "subscribe", "unsubscribe"],

                initialize: function(options) {
                        this._options = options || {};
                        var engineOpts = this._options.engine || {};
                        engineOpts.timeout = this._options.timeout;
                        this._engine = echtzeit.Engine.get(engineOpts);

                        this.info('Created new server: ?', this._options);
                },

                flushConnection: function(messages) {
                        var clientId = echtzeit.clientIdFromMessages(messages);
                        this.info('Flushing connection for ?', clientId);
                        this._engine.flush(clientId);
                },

                openSocket: function(clientId, socket) {
                        this._engine.openSocket(clientId, new echtzeit.Server.Socket(this, socket));
                },

                closeSocket: function(clientId) {
                        this._engine.flush(clientId);
                },

                process: function(messages, local, callback, context) {
                        messages = [].concat(messages);
                        this.info('Processing messages: ? (local: ?)', messages, local);

                        if (messages.length === 0) return callback.call(context, []);
                        var processed = 0,
                                responses = [],
                                self = this;

                        var gatherReplies = function(replies) {
                                responses = responses.concat(replies);
                                ++processed;
                                
                                if (processed < messages.length) return;

                                var n = responses.length;
                                
                                for(;n--;)
                                        !responses[n] && responses.splice(n, 1);
                                
                                self.info('Returning replies: ?', responses);
                                callback.call(context, responses);
                        };

                        var handleReply = function(replies) {
                                var extended = 0,
                                        expected = replies.length;
                                if (expected === 0) gatherReplies(replies);

                                for (var i = 0, n = replies.length; i < n; i++) {
                                        this.debug('Processing reply: ?', replies[i]);
                                        (function(index) {
                                                self.pipeThroughExtensions('outgoing', replies[index], function(message) {
                                                        replies[index] = message;
                                                        extended += 1;
                                                        if (extended === expected) gatherReplies(replies);
                                                });
                                        })(i);
                                }
                        };

                        for (var i = 0, n = messages.length; i < n; i++) {
                                this.pipeThroughExtensions('incoming', messages[i], function(pipedMessage) {
                                                this._handle(pipedMessage, local, handleReply, this);
                                        }, this);
                        }
                },

                _makeResponse: function(message) {
                        var response = {};

                        if (message.id) response.id = message.id;
                        if (message.clientId) response.clientId = message.clientId;
                        if (message.channel) response.channel = message.channel;
                        if (message.error) response.error = message.error;

                        response.successful = !response.error;
                        return response;
                },

                _handle: function(message, local, callback, context) {
                        if (!message) return callback.call(context, []);
                        this.info('Handling message: ? (local: ?)', message, local);

                        var channelName = message.channel,
                                error = message.error,
                                response;

                        if (echtzeit.Channel.isMeta(channelName))
                                return this._handleMeta(message, local, callback, context);

                        if (!echtzeit.Grammar.CHANNEL_NAME.test(channelName))
                                error = echtzeit.Error.channelInvalid(channelName);

                        if (!error) this._engine.publish(message);

                        response = this._makeResponse(message);
                        if (error) response.error = error;
                        response.successful = !response.error;
                        callback.call(context, [response]);
                },

                _handleMeta: function(message, local, callback, context) {
                        var method = echtzeit.Channel.parse(message.channel)[1],
                                clientId = message.clientId,
                                response;

                        if (echtzeit.indexOf(this.META_METHODS, method) < 0) {
                                response = this._makeResponse(message);
                                response.error = echtzeit.Error.channelForbidden(message.channel);
                                response.successful = false;
                                return callback.call(context, [response]);
                        }

                        this[method](message, local, function(responses) {
                                        responses = [].concat(responses);
                                        for (var i = 0, n = responses.length; i < n; i++) this._advize(responses[i], message.connectionType);
                                        callback.call(context, responses);
                                }, this);
                },

                _advize: function(response, connectionType) {
                        if (echtzeit.indexOf([echtzeit.Channel.HANDSHAKE, echtzeit.Channel.CONNECT], response.channel) < 0)
                                return;

                        var interval, timeout;
                        if (connectionType === 'eventsource') {
                                interval = Math.floor(this._engine.timeout * 1000);
                                timeout = 0;
                        } else {
                                interval = Math.floor(this._engine.interval * 1000);
                                timeout = Math.floor(this._engine.timeout * 1000);
                        }

                        response.advice = response.advice || {};
                        if (response.error) {
                                echtzeit.extend(response.advice, {
                                                reconnect: 'handshake'
                                        }, false);
                        } else {
                                echtzeit.extend(response.advice, {
                                                reconnect: 'retry',
                                                interval: interval,
                                                timeout: timeout
                                        }, false);
                        }
                },

                // MUST contain  * version
                //               * supportedConnectionTypes
                // MAY contain   * minimumVersion
                //               * ext
                //               * id
                handshake: function(message, local, callback, context) {
                        var response = this._makeResponse(message);
                        response.version = echtzeit.BAYEUX_VERSION;

                        if (!message.version)
                                response.error = echtzeit.Error.parameterMissing('version');

                        var clientConns = message.supportedConnectionTypes,
                                commonConns;

                        response.supportedConnectionTypes = echtzeit.CONNECTION_TYPES;

                        if (clientConns) {
                                commonConns = echtzeit.filter(clientConns, function(conn) {
                                                return echtzeit.indexOf(echtzeit.CONNECTION_TYPES, conn) >= 0;
                                        });
                                if (commonConns.length === 0)
                                        response.error = echtzeit.Error.conntypeMismatch(clientConns);
                        } else {
                                response.error = echtzeit.Error.parameterMissing('supportedConnectionTypes');
                        }

                        response.successful = !response.error;
                        if (!response.successful) return callback.call(context, response);

                        this._engine.createClient(function(clientId) {
                                        response.clientId = clientId;
                                        callback.call(context, response);
                                }, this);
                },

                // MUST contain  * clientId
                //               * connectionType
                // MAY contain   * ext
                //               * id
                connect: function(message, local, callback, context) {
                        var response = this._makeResponse(message),
                                clientId = message.clientId,
                                connectionType = message.connectionType;

                        this._engine.clientExists(clientId, function(exists) {
                                        if (!exists) response.error = echtzeit.Error.clientUnknown(clientId);
                                        if (!clientId) response.error = echtzeit.Error.parameterMissing('clientId');

                                        if (echtzeit.indexOf(echtzeit.CONNECTION_TYPES, connectionType) < 0)
                                                response.error = echtzeit.Error.conntypeMismatch(connectionType);

                                        if (!connectionType) response.error = echtzeit.Error.parameterMissing('connectionType');

                                        response.successful = !response.error;

                                        if (!response.successful) {
                                                delete response.clientId;
                                                return callback.call(context, response);
                                        }

                                        if (message.connectionType === 'eventsource') {
                                                message.advice = message.advice || {};
                                                message.advice.timeout = 0;
                                        }
                                        this._engine.connect(response.clientId, message.advice, function(events) {
                                                        callback.call(context, [response].concat(events));
                                                });
                                }, this);
                },

                // MUST contain  * clientId
                // MAY contain   * ext
                //               * id
                disconnect: function(message, local, callback, context) {
                        var response = this._makeResponse(message),
                                clientId = message.clientId;

                        this._engine.clientExists(clientId, function(exists) {
                                        if (!exists) response.error = echtzeit.Error.clientUnknown(clientId);
                                        if (!clientId) response.error = echtzeit.Error.parameterMissing('clientId');

                                        response.successful = !response.error;
                                        if (!response.successful) delete response.clientId;

                                        if (response.successful) this._engine.destroyClient(clientId);
                                        callback.call(context, response);
                                }, this);
                },

                // MUST contain  * clientId
                //               * subscription
                // MAY contain   * ext
                //               * id
                subscribe: function(message, local, callback, context) {
                        var response = this._makeResponse(message),
                                clientId = message.clientId,
                                subscription = message.subscription,
                                channel;

                        subscription = subscription ? [].concat(subscription) : [];

                        this._engine.clientExists(clientId, function(exists) {
                                        if (!exists) response.error = echtzeit.Error.clientUnknown(clientId);
                                        if (!clientId) response.error = echtzeit.Error.parameterMissing('clientId');
                                        if (!message.subscription) response.error = echtzeit.Error.parameterMissing('subscription');

                                        response.subscription = message.subscription || [];

                                        for (var i = 0, n = subscription.length; i < n; i++) {
                                                channel = subscription[i];

                                                if (response.error) break;
                                                if (!local && !echtzeit.Channel.isSubscribable(channel)) response.error = echtzeit.Error.channelForbidden(channel);
                                                if (!echtzeit.Channel.isValid(channel)) response.error = echtzeit.Error.channelInvalid(channel);

                                                if (response.error) break;
                                                this._engine.subscribe(clientId, channel);
                                        }

                                        response.successful = !response.error;
                                        callback.call(context, response);
                                }, this);
                },

                // MUST contain  * clientId
                //               * subscription
                // MAY contain   * ext
                //               * id
                unsubscribe: function(message, local, callback, context) {
                        var response = this._makeResponse(message),
                                clientId = message.clientId,
                                subscription = message.subscription,
                                channel;

                        subscription = subscription ? [].concat(subscription) : [];

                        this._engine.clientExists(clientId, function(exists) {
                                        if (!exists) response.error = echtzeit.Error.clientUnknown(clientId);
                                        if (!clientId) response.error = echtzeit.Error.parameterMissing('clientId');
                                        if (!message.subscription) response.error = echtzeit.Error.parameterMissing('subscription');

                                        response.subscription = message.subscription || [];

                                        for (var i = 0, n = subscription.length; i < n; i++) {
                                                channel = subscription[i];

                                                if (response.error) break;
                                                if (!local && !echtzeit.Channel.isSubscribable(channel)) response.error = echtzeit.Error.channelForbidden(channel);
                                                if (!echtzeit.Channel.isValid(channel)) response.error = echtzeit.Error.channelInvalid(channel);

                                                if (response.error) break;
                                                this._engine.unsubscribe(clientId, channel);
                                        }

                                        response.successful = !response.error;
                                        callback.call(context, response);
                                }, this);
                }
        });

echtzeit.extend(echtzeit.Server.prototype, echtzeit.Logging);
echtzeit.extend(echtzeit.Server.prototype, echtzeit.Extensible);
