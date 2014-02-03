echtzeit.Timeouts = {
        addTimeout: function(name, delay, callback, context) {
                this._timeouts = this._timeouts || {};
                if (this._timeouts.hasOwnProperty(name)) return;
                var self = this;
                this._timeouts[name] = echtzeit.ENV.setTimeout(function() {
                        delete self._timeouts[name];
                        callback.call(context);
                }, 1000 * delay);
        },
        removeAllTimeouts: function() {
                this._timeouts = this._timeouts || {};
                for (var name in this._timeouts) this.removeTimeout(name);
        },
        removeTimeout: function(name) {
                this._timeouts = this._timeouts || {};
                var timeout = this._timeouts[name];
                if (!timeout) return;
                clearTimeout(timeout);
                delete this._timeouts[name];
        }
};