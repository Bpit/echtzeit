fs = require("fs"), path = require("path"), util = require("util");
_bpath = path.join(__dirname, "..", "bin");
!fs.existsSync(_bpath) && fs.mkdirSync(_bpath);
_clog = function () { process.stdout.write(util.format.apply(this, arguments)); }

core = [
        "_head.js",
        "echtzeit.js",
        "util/class.js",
        "util/event_emitter",
        "util/namespace.js",
        "util/promise.js",
        "util/set.js",
        "util/uri.js",
        "error.js",
        "mixins/deferrable.js",
        "mixins/publisher.js",
        "mixins/timeouts.js",
        "mixins/logging.js",
        "protocol/grammar.js",
        "protocol/extensible.js",
        "protocol/channel.js",
        "protocol/publication.js",
        "protocol/subscription.js",
        "protocol/client.js",
        "transport/transport.js"
];

node = [
        "engines/proxy.js",
        "engines/connection.js",
        "engines/memory.js",
        "protocol/server.js",
        "protocol/socket.js",
        "transport/node_local.js",
        "transport/web_socket.js",
        "transport/node_http.js",
        "adapters/node_adapter.js",
        "util/streamcache.js",
        "adapters/static_server.js",
        "_tail.js"
];

browser = [
        "util/browser/event.js",
        "transport/web_socket.js",
        "transport/event_source.js",
        "transport/xhr.js",
        "transport/cors.js",
        "transport/jsonp.js",
        "_tail.js"
];

_gather = function (a) {
        _state = "";
        for ( b in a ) _state += fs.readFileSync(path.join(__dirname, "..", "src/", a[b])) + "\n"
        return _state;
}

_core = _gather(core);

[
        ["========= ECHTZEIT/BUILD ========="],
        [""],
        ["Compiling Echtzeit/Node.. ", !fs.writeFileSync(_bpath + "/echtzeit.js", _core + _gather(node)) && "", "done."],
        ["Creating Echtzeit/Client Path.. ", !fs.existsSync(_bpath + "/client") && !fs.mkdirSync(_bpath + "/client") && "" || "", "done."],
        ["Compiling Echtzeit/Client.. ", !fs.writeFileSync(_bpath + "/client/echtzeit.client.js", _core + _gather(browser)) && "", "done."],
        [""]
].forEach(function (v) { _clog(v.join("")+"\n") })