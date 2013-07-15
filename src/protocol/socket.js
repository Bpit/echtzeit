echtzeit.Server.Socket = echtzeit.Class({
        initialize: function(server, socket) {
                this._server = server;
                this._socket = socket;
        },

        send: function(message) {
                this._server.pipeThroughExtensions('outgoing', message, function(pipedMessage) {
                        this._socket && this._socket.send(echtzeit.toJSON([pipedMessage]));
                }, this);
        },

        close: function() {
                this._socket && this._socket.close();
                delete this._socket;
        }
});
