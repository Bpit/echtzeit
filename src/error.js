echtzeit.Error = echtzeit.Class({
                initialize: function(code, params, message) {
                        this.code = code;
                        this.params = Array.prototype.slice.call(params);
                        this.message = message;
                },
                toString: function() {
                        return this.code + ':' + this.params.join(',') + ':' + this.message;
                }
        });
echtzeit.Error.parse = function(message) {
        message = message || '';
        if (!echtzeit.Grammar.ERROR.test(message)) return new this(null, [], message);
        var parts = message.split(':'),
                code = parseInt(parts[0]),
                params = parts[1].split(','),
                message = parts[2];
        return new this(code, params, message);
};
echtzeit.Error.versionMismatch = function() {
        return new this(300, arguments, "Version mismatch").toString();
};
echtzeit.Error.conntypeMismatch = function() {
        return new this(301, arguments, "Connection types not supported").toString();
};
echtzeit.Error.extMismatch = function() {
        return new this(302, arguments, "Extension mismatch").toString();
};
echtzeit.Error.badRequest = function() {
        return new this(400, arguments, "Bad request").toString();
};
echtzeit.Error.clientUnknown = function() {
        return new this(401, arguments, "Unknown client").toString();
};
echtzeit.Error.parameterMissing = function() {
        return new this(402, arguments, "Missing required parameter").toString();
};
echtzeit.Error.channelForbidden = function() {
        return new this(403, arguments, "Forbidden channel").toString();
};
echtzeit.Error.channelUnknown = function() {
        return new this(404, arguments, "Unknown channel").toString();
};
echtzeit.Error.channelInvalid = function() {
        return new this(405, arguments, "Invalid channel").toString();
};
echtzeit.Error.extUnknown = function() {
        return new this(406, arguments, "Unknown extension").toString();
};
echtzeit.Error.publishFailed = function() {
        return new this(407, arguments, "Failed to publish").toString();
};
echtzeit.Error.serverError = function() {
        return new this(500, arguments, "Internal server error").toString();
};
