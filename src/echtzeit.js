var echtzeit = {
        VERSION: '1.1.0',

        BAYEUX_VERSION: '1.0',
        ID_LENGTH: 160,
        JSONP_CALLBACK: 'ezd',
        CONNECTION_TYPES: ['long-polling', 'cross-origin-long-polling', 'callback-polling', 'websocket', 'eventsource', 'in-process'],

        MANDATORY_CONNECTION_TYPES: ['long-polling', 'callback-polling', 'in-process'],

        ENV: this["window"] || global,

        fireback: true,

        extend: function(dest, source, overwrite) {
                if (!source) return dest;
                for (var key in source) {
                        if (!source.hasOwnProperty(key)) continue;
                        if (dest.hasOwnProperty(key) && overwrite === false) continue;
                        if (dest[key] !== source[key])
                                dest[key] = source[key];
                }
                return dest;
        },

        random: function(bitlength) {
                return csprng(bitlength, 36);
        },

        clientIdFromMessages: function(messages) {
                var connect = this.filter([].concat(messages), function(message) {
                        return message.channel === '/meta/connect';
                });

                return connect[0] && connect[0].clientId;
        },

        copyObject: function(object) {
                var clone, i, key;
                if (object instanceof Array) {
                        clone = [];
                        i = object.length;
                        while (i--) clone[i] = echtzeit.copyObject(object[i]);
                        return clone;
                } else if (object instanceof Object) {
                        clone = (object === null) ? null : {};
                        for (key in object) clone[key] = echtzeit.copyObject(object[key]);
                        return clone;
                } else {
                        return object;
                }
        },

        commonElement: function(lista, listb) {
                for (var i = 0, n = lista.length; i < n; i++) {
                        if (this.indexOf(listb, lista[i]) !== -1)
                                return lista[i];
                }
                return null;
        },

        indexOf: function(list, needle) {
                if (list.indexOf) return list.indexOf(needle);

                for (var i = 0, n = list.length; i < n; i++) {
                        if (list[i] === needle) return i;
                }
                return -1;
        },

        map: function(object, callback, context) {
                if (object.map) return object.map(callback, context);
                var result = [];

                if (object instanceof Array) {
                        for (var i = 0, n = object.length; i < n; i++) {
                                result.push(callback.call(context || null, object[i], i));
                        }
                } else {
                        for (var key in object) {
                                if (!object.hasOwnProperty(key)) continue;
                                result.push(callback.call(context || null, key, object[key]));
                        }
                }
                return result;
        },

        filter: function(array, callback, context) {
                var result = [];
                for (var i = 0, n = array.length; i < n; i++) {
                        if (callback.call(context || null, array[i], i))
                                result.push(array[i]);
                }
                return result;
        },

        asyncEach: function(list, iterator, callback, context) {
                var n = list.length,
                        i = -1,
                        calls = 0,
                        looping = false;

                var iterate = function() {
                        calls -= 1;
                        i += 1;
                        if (i === n) return callback && callback.call(context);
                        iterator(list[i], resume);
                };

                var loop = function() {
                        if (looping) return;
                        looping = true;
                        while (calls > 0) iterate();
                        looping = false;
                };

                var resume = function() {
                        calls += 1;
                        loop();
                };
                resume();
        },

        toJSON: function(object) {
                if (!this.stringify) return JSON.stringify(object);
                
                return this.stringify(object, function(key, value) {
                        return (this[key] instanceof Array) ? this[key] : value;
                });
        }
};