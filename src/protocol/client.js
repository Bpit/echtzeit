echtzeit.Client = echtzeit.Class({
        UNCONNECTED: 1,
        CONNECTING: 2,
        CONNECTED: 3,
        DISCONNECTED: 4,
        HANDSHAKE: 'handshake',
        RETRY: 'retry',
        NONE: 'none',
        CONNECTION_TIMEOUT: 60.0,
        DEFAULT_RETRY: 5.0,
        MAX_REQUEST_SIZE: 2048,
        DEFAULT_ENDPOINT: '/bayeux',
        INTERVAL: 0.0,
        initialize: function(endpoint, options) {
                this.info('New client created for ?', endpoint);
                this._options = options || {};
                this.endpoint = echtzeit.URI.parse(endpoint || this.DEFAULT_ENDPOINT);
                this.endpoints = this._options.endpoints || {};
                this.transports = {};
                this.cookies = echtzeit.CookieJar && new echtzeit.CookieJar();
                this.headers = {};
                this.ca = this._options.ca;
                this._disabled = [];
                this._retry = this._options.retry || this.DEFAULT_RETRY;

                for (var key in this.endpoints)
                        this.endpoints[key] = echtzeit.URI.parse(this.endpoints[key]);

                this.maxRequestSize = this.MAX_REQUEST_SIZE;

                this._state = this.UNCONNECTED;
                this._channels = new echtzeit.Channel.Set();
                this._messageId = 0;

                this._responseCallbacks = {};

                this._advice = {
                        reconnect: this.RETRY,
                        interval: 1000 * (this._options.interval || this.INTERVAL),
                        timeout: 1000 * (this._options.timeout || this.CONNECTION_TIMEOUT)
                };
                if (echtzeit.Event && echtzeit.ENV.onbeforeunload !== undefined)
                        echtzeit.Event.on(echtzeit.ENV, 'beforeunload', function() {
                                if (echtzeit.indexOf(this._disabled, 'autodisconnect') < 0)
                                        this.disconnect();
                        }, this);
        },
        disable: function(feature) {
                this._disabled.push(feature);
        },
        setHeader: function(name, value) {
                this.headers[name] = value;
        },
        // Request
        // MUST include:  * channel
        //                * version
        //                * supportedConnectionTypes
        // MAY include:   * minimumVersion
        //                * ext
        //                * id
        //
        // Success Response                             Failed Response
        // MUST include:  * channel                     MUST include:  * channel
        //                * version                                    * successful
        //                * supportedConnectionTypes                   * error
        //                * clientId                    MAY include:   * supportedConnectionTypes
        //                * successful                                 * advice
        // MAY include:   * minimumVersion                             * version
        //                * advice                                     * minimumVersion
        //                * ext                                        * ext
        //                * id                                         * id
        //                * authSuccessful
        handshake: function(callback, context) {
                if (this._advice.reconnect === this.NONE) return;
                if (this._state !== this.UNCONNECTED) return;
                this._state = this.CONNECTING;
                var self = this;
                this.info('Initiating handshake with ?', echtzeit.URI.stringify(this.endpoint));
                this._selectTransport(echtzeit.MANDATORY_CONNECTION_TYPES);
                this._send({
                        channel: echtzeit.Channel.HANDSHAKE,
                        version: echtzeit.BAYEUX_VERSION,
                        supportedConnectionTypes: [this._transport.connectionType]
                }, function(response) {
                        if (response.successful) {
                                this._state = this.CONNECTED;
                                this._clientId = response.clientId;
                                this._selectTransport(response.supportedConnectionTypes);
                                this.info('Handshake successful: ?', this._clientId);
                                this.subscribe(this._channels.getKeys(), true);
                                if (callback)
                                        echtzeit.Promise.defer(function() {
                                                callback.call(context)
                                        });
                        } else {
                                this.info('Handshake unsuccessful');
                                echtzeit.ENV.setTimeout(function() {
                                        self.handshake(callback, context)
                                }, this._advice.interval);
                                this._state = this.UNCONNECTED;
                        }
                }, this);
        },
        // Request                              Response
        // MUST include:  * channel             MUST include:  * channel
        //                * clientId                           * successful
        //                * connectionType                     * clientId
        // MAY include:   * ext                 MAY include:   * error
        //                * id                                 * advice
        //                                                     * ext
        //                                                     * id
        //                                                     * timestamp
        connect: function(callback, context) {
                if (this._advice.reconnect === this.NONE) return;
                if (this._state === this.DISCONNECTED) return;
                if (this._state === this.UNCONNECTED)
                        return this.handshake(function() {
                                this.connect(callback, context)
                        }, this);
                this.callback(callback, context);
                if (this._state !== this.CONNECTED) return;
                this.info('Calling deferred actions for ?', this._clientId);
                this.setDeferredStatus('succeeded');
                this.setDeferredStatus('unknown');
                if (this._connectRequest) return;
                this._connectRequest = true;
                this.info('Initiating connection for ?', this._clientId);
                this._send({
                        channel: echtzeit.Channel.CONNECT,
                        clientId: this._clientId,
                        connectionType: this._transport.connectionType
                }, this._cycleConnection, this);
        },
        // Request                              Response
        // MUST include:  * channel             MUST include:  * channel
        //                * clientId                           * successful
        // MAY include:   * ext                                * clientId
        //                * id                  MAY include:   * error
        //                                                     * ext
        //                                                     * id
        disconnect: function() {
                if (this._state !== this.CONNECTED) return;
                this._state = this.DISCONNECTED;
                this.info('Disconnecting ?', this._clientId);
                this._send({
                        channel: echtzeit.Channel.DISCONNECT,
                        clientId: this._clientId
                }, function(response) {
                        if (!response.successful) return;
                        this._transport.close();
                        delete this._transport;
                }, this);
                this.info('Clearing channel listeners for ?', this._clientId);
                this._channels = new echtzeit.Channel.Set();
        },
        // Request                              Response
        // MUST include:  * channel             MUST include:  * channel
        //                * clientId                           * successful
        //                * subscription                       * clientId
        // MAY include:   * ext                                * subscription
        //                * id                  MAY include:   * error
        //                                                     * advice
        //                                                     * ext
        //                                                     * id
        //                                                     * timestamp
        subscribe: function(channel, callback, context) {
                if (channel instanceof Array)
                        return echtzeit.map(channel, function(c) {
                                return this.subscribe(c, callback, context);
                        }, this);
                var subscription = new echtzeit.Subscription(this, channel, callback, context),
                        force = (callback === true),
                        hasSubscribe = this._channels.hasSubscription(channel);
                if (hasSubscribe && !force) {
                        this._channels.subscribe([channel], callback, context);
                        subscription.setDeferredStatus('succeeded');
                        return subscription;
                }
                this.connect(function() {
                        this.info('Client ? attempting to subscribe to ?', this._clientId, channel);
                        if (!force) this._channels.subscribe([channel], callback, context);
                        this._send({
                                channel: echtzeit.Channel.SUBSCRIBE,
                                clientId: this._clientId,
                                subscription: channel
                        }, function(response) {
                                if (!response.successful) {
                                        subscription.setDeferredStatus('failed', echtzeit.Error.parse(response.error));
                                        return this._channels.unsubscribe(channel, callback, context);
                                }
                                var channels = [].concat(response.subscription);
                                this.info('Subscription acknowledged for ? to ?', this._clientId, channels);
                                subscription.setDeferredStatus('succeeded');
                        }, this);
                }, this);
                return subscription;
        },
        // Request                              Response
        // MUST include:  * channel             MUST include:  * channel
        //                * clientId                           * successful
        //                * subscription                       * clientId
        // MAY include:   * ext                                * subscription
        //                * id                  MAY include:   * error
        //                                                     * advice
        //                                                     * ext
        //                                                     * id
        //                                                     * timestamp
        unsubscribe: function(channel, callback, context) {
                if (channel instanceof Array)
                        return echtzeit.map(channel, function(c) {
                                return this.unsubscribe(c, callback, context);
                        }, this);
                var dead = this._channels.unsubscribe(channel, callback, context);
                if (!dead) return;
                this.connect(function() {
                        this.info('Client ? attempting to unsubscribe from ?', this._clientId, channel);
                        this._send({
                                channel: echtzeit.Channel.UNSUBSCRIBE,
                                clientId: this._clientId,
                                subscription: channel
                        }, function(response) {
                                if (!response.successful) return;
                                var channels = [].concat(response.subscription);
                                this.info('Unsubscription acknowledged for ? from ?', this._clientId, channels);
                        }, this);
                }, this);
        },
        // Request                              Response
        // MUST include:  * channel             MUST include:  * channel
        //                * data                               * successful
        // MAY include:   * clientId            MAY include:   * id
        //                * id                                 * error
        //                * ext                                * ext
        publish: function(channel, data) {
                var publication = new echtzeit.Publication();
                this.connect(function() {
                        this.info('Client ? queueing published message to ?: ?', this._clientId, channel, data);
                        this._send({
                                channel: channel,
                                data: data,
                                clientId: this._clientId
                        }, function(response) {
                                if (response.successful)
                                        publication.setDeferredStatus('succeeded');
                                else
                                        publication.setDeferredStatus('failed', echtzeit.Error.parse(response.error));
                        }, this);
                }, this);
                return publication;
        },
        receiveMessage: function(message) {
                var id = message.id,
                        timeout, callback;

                if (message.successful !== undefined) {
                        callback = this._responseCallbacks[id];
                        delete this._responseCallbacks[id];
                }

                this.pipeThroughExtensions('incoming', message, function(message) {
                        if (!message) return;

                        if (message.advice) this._handleAdvice(message.advice);
                        this._deliverMessage(message);

                        if (callback) callback[0].call(callback[1], message);
                }, this);

                if (this._transportUp === true) return;
                this._transportUp = true;
                this.trigger('transport:up');
        },
        messageError: function(messages, immediate) {
                var retry = this._retry,
                        self = this,
                        id, message, timeout;

                for (var i = 0, n = messages.length; i < n; i++) {
                        message = messages[i];
                        id = message.id;

                        if (immediate)
                                this._transportSend(message);
                        else
                                echtzeit.ENV.setTimeout(function() {
                                        self._transportSend(message)
                                }, retry * 1000);
                }

                if (immediate || this._transportUp === false) return;
                this._transportUp = false;
                this.trigger('transport:down');
        },
        _selectTransport: function(transportTypes) {
                echtzeit.Transport.get(this, transportTypes, this._disabled, function(transport) {
                        this.debug('Selected ? transport for ?', transport.connectionType, echtzeit.URI.stringify(transport.endpoint));
                        if (transport === this._transport) return;
                        if (this._transport) this._transport.close();
                        this._transport = transport;
                }, this);
        },
        _send: function(message, callback, context) {
                if (!this._transport) return;
                
                message.id = message.id || this._generateMessageId();

                this.pipeThroughExtensions('outgoing', message, function(message) {
                        if (!message) return;
                        if (callback) this._responseCallbacks[message.id] = [callback, context];
                        this._transportSend(message);
                }, this);
        },
        _transportSend: function(message) {
                if (!this._transport) return;

                var timeout  = 1.2 * (this._advice.timeout || this._retry * 1000),
                    envelope = new echtzeit.Envelope(message, timeout);

                envelope.errback(function(immediate) {
                        this.messageError([message], immediate);
                }, this);

                this._transport.send(envelope);
        },
        _generateMessageId: function() {
                this._messageId += 1;
                if (this._messageId >= Math.pow(2, 32)) this._messageId = 0;
                return this._messageId.toString(36);
        },
        _handleAdvice: function(advice) {
                echtzeit.extend(this._advice, advice);
                if (this._advice.reconnect === this.HANDSHAKE && this._state !== this.DISCONNECTED) {
                        this._state = this.UNCONNECTED;
                        this._clientId = null;
                        this._cycleConnection();
                }
        },
        _deliverMessage: function(message) {
                if (!message.channel || message.data === undefined) return;
                this.info('Client ? calling listeners for ? with ?', this._clientId, message.channel, message.data);
                this._channels.distributeMessage(message);
        },
        _cycleConnection: function() {
                if (this._connectRequest) {
                        this._connectRequest = null;
                        this.info('Closed connection for ?', this._clientId);
                }
                var self = this;
                echtzeit.ENV.setTimeout(function() {
                        self.connect()
                }, this._advice.interval);
        }
});

echtzeit.extend(echtzeit.Client.prototype, echtzeit.Deferrable);
echtzeit.extend(echtzeit.Client.prototype, echtzeit.Publisher);
echtzeit.extend(echtzeit.Client.prototype, echtzeit.Logging);
echtzeit.extend(echtzeit.Client.prototype, echtzeit.Extensible);