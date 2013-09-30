echtzeit.Transport.NodeLocal = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
        batching: false,
        request: function(envelopes) {
                var messages = echtzeit.map(envelopes, function(e) {
                        return e.message
                });

                messages = echtzeit.copyObject(messages);

                this.endpoint.process(messages, true, function(responses) {
                        this.receive(envelopes, echtzeit.copyObject(responses));
                }, this);
        }
}), {
        isUsable: function(client, endpoint, callback, context) {
                callback.call(context, endpoint instanceof echtzeit.Server);
        }
});
echtzeit.Transport.register('in-process', echtzeit.Transport.NodeLocal);