echtzeit.Envelope = echtzeit.Class({
        initialize: function(message, timeout) {
                this.id = message.id;
                this.message = message;

                if (timeout !== undefined)
                        this.timeout(timeout / 1000, false);
        }
});

echtzeit.extend(echtzeit.Envelope.prototype, echtzeit.Deferrable);