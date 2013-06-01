echtzeit.util = echtzeit.util && echtzeit.util.constructor instanceof Object && echtzeit.util || {};
echtzeit.util._Stream = require("stream").Stream;

echtzeit.util.StreamCache = function () {
        echtzeit.util._Stream.call(this);
        this.readable = this.writable = !0;
        this._buffers = [];
        this._dests = []; this._ended = !1
}

require("util").inherits(echtzeit.util.StreamCache, echtzeit.util._Stream);

echtzeit.util.StreamCache.prototype.write = function (a) {
        this._buffers.push(a);
        this._dests.forEach(function (b) { b.write(a) })
};

echtzeit.util.StreamCache.prototype.pipe = function (a, b) {
        if (b) return false;
        this._buffers.forEach(function (b) { a.write(b) });
        if (this._ended) return a.end(), a;
        this._dests.push(a);
        return a
};

echtzeit.util.StreamCache.prototype.getLength = function () {
        return this._buffers.reduce(function (a, b) { return a + b.length }, 0)
};

echtzeit.util.StreamCache.prototype.end = function () {
        this._dests.forEach(function (a) { a.end() });
        this._ended = !0; this._dests = []
};

echtzeit.util._CachedReadStream = {};

echtzeit.util.createCachedReadStream = function (a, b) {
        void 0 === b && (b = {})

        // whereas a is fd_ref && b is typeof object
        // __ if a, b do not statisfy (String a, Object b) forward to base implementation
        if ( !(typeof a === "string" ) || !(typeof b === "object"))
                return fs.createReadStream.apply(this, arguments);

        if ( echtzeit.util._CachedReadStream[a] ) return echtzeit.util._CachedReadStream[a];

        echtzeit.util._CachedReadStream[a] = new echtzeit.util.StreamCache();
        fs.createReadStream(a, b).pipe(echtzeit.util._CachedReadStream[a]);
        return echtzeit.util._CachedReadStream[a];            
}