echtzeit.Server.Socket = echtzeit.Class({
  initialize: function(server, socket) {
    this._server = server;
    this._socket = socket;
  },

  send: function(message) {
    this._server.pipeThroughExtensions('outgoing', message, function(pipedMessage) {
      this._socket.send(JSON.stringify([pipedMessage]));
    }, this);
  },

  close: function() {
    this._socket.close();
  }
});

