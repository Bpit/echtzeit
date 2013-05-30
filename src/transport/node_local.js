echtzeit.Transport.NodeLocal = echtzeit.extend(echtzeit.Class(echtzeit.Transport, {
  batching: false,

  request: function(message, timeout) {
    message = echtzeit.copyObject(message);
    this.endpoint.process(message, true, function(responses) {
      this.receive(echtzeit.copyObject(responses));
    }, this);
  }
}), {
  isUsable: function(client, endpoint, callback, context) {
    callback.call(context, endpoint instanceof echtzeit.Server);
  }
});

echtzeit.Transport.register('in-process', echtzeit.Transport.NodeLocal);
