/*
         __                            ___             
        /\ \                     __  /'___\            
        \ \ \         __     __ /\_\/\ \__/  __  __    
         \ \ \  __  /'__`\ /'_ `\/\ \ \ ,__\/\ \/\ \   
          \ \ \L\ \/\  __//\ \L\ \ \ \ \ \_/\ \ \_\ \  
           \ \____/\ \____\ \____ \ \_\ \_\  \/`____ \ 
            \/___/  \/____/\/___L\ \/_/\/_/   `/___/> \
                             /\____/             /\___/
                             \_/__/              \/__/

        Copyright (c) 2013 by Legify UG. All Rights Reserved.

        [Portions/Faye] Copyright (c) 2009-2013 James Coglan and contributors
 
        Permission is hereby granted, free of charge, to any person obtaining a copy
        of this software and associated documentation files (the "Software"), to deal
        in the Software without restriction, including without limitation the rights
        to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
        copies of the Software, and to permit persons to whom the Software is
        furnished to do so, subject to the following conditions:
 
        The above copyright notice and this permission notice shall be included in
        all copies or substantial portions of the Software.
 
        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
        AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
        LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
        OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
        THE SOFTWARE.
*/

'use strict';

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
                bitlength = bitlength || this.ID_LENGTH;
                if (bitlength > 32) {
                        var parts = Math.ceil(bitlength / 32),
                                string = '';
                        while (parts--) string += this.random(32);
                        var chars = string.split(''),
                                result = '';
                        while (chars.length > 0) result += chars.pop();
                        return result;
                }
                var limit = Math.pow(2, bitlength) - 1,
                        maxSize = limit.toString(36).length,
                        string = Math.floor(Math.random() * limit).toString(36);

                while (string.length < maxSize) string = '0' + string;
                return string;
        },

        clientIdFromMessages: function(messages) {
                var first = [].concat(messages)[0];
                return first && first.clientId;
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
                return JSON.stringify(object, function(key, value) {
                                return (this[key] instanceof Array) ? this[key] : value;
                        });
        }
};

if (typeof module !== 'undefined')
        module.exports = echtzeit;
else if (typeof window !== 'undefined')
        window.echtzeit = echtzeit;