echtzeit.Logging = {
        LOG_LEVELS: {
                error: 3,
                warn: 2,
                info: 1,
                debug: 0
        },

        logLevel: 'error',

        log: function(messageArgs, level) {
                if (!echtzeit.logger) return;

                var levels = echtzeit.Logging.LOG_LEVELS;
                if (levels[echtzeit.Logging.logLevel] > levels[level]) return;

                var messageArgs = Array.prototype.slice.apply(messageArgs),
                        banner = ' [' + level.toUpperCase() + '] [echtzeit',
                        klass = this.className,

                        message = messageArgs.shift().replace(/\?/g, function() {
                                        try {
                                                return echtzeit.toJSON(messageArgs.shift());
                                        } catch (e) {
                                                return '[Object]';
                                        }
                                });

                for (var key in echtzeit) {
                        if (klass) continue;
                        if (typeof echtzeit[key] !== 'function') continue;
                        if (this instanceof echtzeit[key]) klass = key;
                }
                if (klass) banner += '.' + klass;
                banner += '] ';

                echtzeit.logger(echtzeit.timestamp() + banner + message);
        }
};

(function() {
                for (var key in echtzeit.Logging.LOG_LEVELS)
                        (function(level, value) {
                                        echtzeit.Logging[level] = function() {
                                                this.log(arguments, level);
                                        };
                                })(key, echtzeit.Logging.LOG_LEVELS[key]);
        })();
