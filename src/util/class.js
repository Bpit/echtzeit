echtzeit.Class = function (parent, methods) {
        if (!(parent instanceof Function)) {
                methods = parent;
                parent = Object;
        }
        var klass = function () {
                if (!this.initialize) return this;
                return this.initialize.apply(this, arguments) || this;
        };
        var bridge = function () {};
        bridge.prototype = parent.prototype;
        klass.prototype = new bridge();
        echtzeit.extend(klass.prototype, methods);
        return klass;
};