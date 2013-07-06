echtzeit.Logging = {
        LOG_LEVELS: {
                fatal: 4,
                error: 3,
                warn: 2,
                info: 1,
                debug: 0
        },

        logLevel: 'error',

        writeLog: function(messageArgs, level) {
                if (!echtzeit.logger) return;

                var messageArgs = Array.prototype.slice.apply(messageArgs),
                        banner  = '[echtzeit',
                        klass   = this.className,

                        message = messageArgs.shift().replace(/\?/g, function() {
                                        try {
                                                return echtzeit.toJSON(messageArgs.shift());
                                        } catch (e) {
                                                return '[Object]';
                                        }
                                });

                for (var key in echtzeit) {
                        if (klass) continue;
                        if (!(echtzeit[key] instanceof Function)) continue;
                        if (this instanceof echtzeit[key]) klass = key;
                }
                if (klass) banner += '.' + klass;
                banner += '] ';

                if (typeof echtzeit.logger[level] === 'function')
                        echtzeit.logger[level](banner + message);
                else if (typeof echtzeit.logger === 'function')
                        echtzeit.logger(banner + message);
        }
};

(function() {
        for (var key in echtzeit.Logging.LOG_LEVELS)
                (function(level, value) {
                                echtzeit.Logging[level] = function() {
                                        this.writeLog(arguments, level);
                                };
                        })(key, echtzeit.Logging.LOG_LEVELS[key]);
})();
