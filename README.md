![Echtzeit by Legify GmbH](http://data.sly.mn/PK6E/echtzeit.png)
===========

Echtzeit is a highly optimized toolset for pub/sub messaging between web clients built to scale.

This is an enterprise fork of Faye, please see http://faye.jcoglan.com for further information on the general purpose toolset with Ruby/Rack support. However, we endorse any *business to business* dialog and are open for support at `kenan@legify.com` — please include information about the company you represent and the purpose of your *echtzeit* integration.

Installation
------------

  `npm install echtzeit`

Usage
------------

	With the recent changes echtzeit and Faye, the engine will only listen if it is attached to an arbitrary server. Where echtzeit.listen was used, create a new server [var srv = (http/https).createServer()], attach an initialized instance [var ez = new echtzeit.NodeAdapter({mount: '/', timeout: 45})] to the server with [ez.attach(srv)] and finally listen to a port by [srv.listen(…)].

*Echtzeit* makes it easy to kickstart your realtime environment by providing an abstraction layer which covers all transport-ways you love including WebSocket, JSONP, Polling and XHR. *Echtzeit* is adaptive and implements an intelligent extension system.

You kickstart the *echtzeit* engine by initializing it and attaching it to an arbitrary server of your choice — including *http*, *https* and *spdy*.

	var echtzeit = require("echtzeit"),
	ez = new echtzeit.NodeAdapter({mount: '/app', timeout: 45});

The mountpoint makes it easy to attach to a server without disrupting its functions or service.

	var srv = http.Server(); ez.attach(srv); srv.listen(643);

If you power it up and head to `http://127.0.0.1:643/app/client.js` you'll see *echtzeit*'s client library — which also implies *echtzeit* is working.

This is great! Let's listen to a channel and ditch that rocket-science degree:

	ez.getClient().subscribe("/public", function ( message ) { });

We're using *echtzeit*'s internal client for the server which gets rid of all the initialization clutter we would might face. Great so far, let's get started with the userland.

This ain't rocket-science, too: just include the client library and use the same way to connect to *echtzeit*.

	<script type="text/javascript" src="http://127.0.0.1:643/app/client.js"></script>
	<script type="text/javascript">
		var ez = new echtzeit.Client('http://127.0.0.1:643/app');
	</script>

Now listen on a channel and you're ready to go:

	ez.subscribe('/public', function( message ) { alert( message.text ) });

Go ahead, open some windows and type this into the console of one window:

	ez.publish("/public", { text: "Hey, friends!" });

You can do the plain same on the server:

	ez.getClient().publish('/public', { text: "Hey, friends!" });

Changelog
------------

### 1.5.1 [Faye/1.0.1] / Superposition (II) <sup>†</sup>

* Add `Adapter#close()` method for gracefully shutting down the server
* Fix error recover bug in WebSocket that made transport cycle through `up`/`down` state
* Update Promise implementation to pass `promises-aplus-tests 2.0`
* Add `concat-stream` for collecting request data over stream

### 1.5.0 / Superposition

* Client changes:
  * Allow clients to be instantiated with URI objects rather than strings
  * Add a `ca` option to the Node `Client` class for passing in trusted server certificates
  * Objects supporting the `callback()` method in JavaScript are now Promises
  * Fix protocol-relative URI parsing in the client
  * Remove the `getClientId()` and `getState()` methods from the `Client` class
* Transport changes:
  * Add request-size limiting to all batching transports
  * Make the WebSocket transport more robust against quiet network periods and clients going to sleep
  * Support cookies across all transports when using the client on Node.js or Ruby
  * Support custom headers in the `cross-origin-long-polling` and server-side `websocket` transports
* Adapter changes:
  * Add an `origins` option to the server to whitelist authorized origins
  * Escape U+2028 and U+2029 in JSON-P output
  * Fix a bug stopping requests being routed when the mount point is `/`
  * Fix various bugs that cause errors to be thrown if we try to send a message over a closed socket
  * Remove the `listen()` method from `Adapter` in favour of using server-specific APIs
* Server changes:
  * Use cryptographically secure random number generators to create client IDs
  * Allow extensions to access request properties by using 3-ary methods
  * Objects supporting the `bind()` method now implement the full `EventEmitter` API
  * Stop the server from forwarding the `clientId` property of published messages
* Miscellaneous:
  * Support Browserify by returning the client module
  * `echtzeit.logger` can now be a logger object rather than a function

### 1.0.0 / Co-Existence

* Specify ciphers for SSL on Node to mitigate the BEAST attack
* Mitigate increased risk of socket hang-up errors in Node v0.8.20
* Fix race condition when processing outgoing extensions in the Node server
* Fix problem loading the client script when using `{mount: '/'}`
* Clean up connection objects when a WebSocket is re-used with a new clientId
* All JavaScript code now runs in strict mode
* Select transport on handshake, instead of on client creation to allow time for `disable()` calls
* Do not speculatively open WebSocket/EventSource connections if they are disabled
* Gracefully handle WebSocket messages with no data on the client side
* Close and reconnect WebSocket when onerror is fired, not just when onclose is fired
* Fix problem with caching of EventSource connections with stale clientIds
* Don't parse query strings when checking if a URL is same-origin or not

<sup>†</sup> May mutate and evolute at any time.

Issues [![Build Status](https://travis-ci.org/Legify/echtzeit.png)](https://travis-ci.org/Legify/echtzeit)
------------

Feel free to open an issue if you think anything specific to this fork should be discussed. PRs are welcome. See the above notice if you have questions regarding *echtzeit*.

Differences to Faye
------------

* `fireback` flag controlling behaviour whether messages are sent back to the client who emitted them
* `client.js` is cached and piped to every client from memory, rather than reading it from disk
* Overall performance optimizations
* More lightweight

License
------------

Copyright (c) 2013 by Legify UG. All Rights Reserved.

[Portions/Faye] Copyright (c) 2009-2013 James Coglan and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
