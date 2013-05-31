url = url || require('url')

echtzeit.StaticServer = echtzeit.Class({
                initialize: function(directory, pathRegex) {
                        this._dir = directory;
                        this._pRegex = pathRegex;
                        this._pMap = {};
                        this._index = {};
                },

                map: function(requestPath, filename) {
                        this._pMap[requestPath] = filename;
                },

                test: function(pathname) {
                        return this._pRegex.test(pathname);
                },

                call: function(request, response) {
                        var uri = url.parse(request.url).pathname,
                        fn = path.join(this._dir, this._pMap[path.basename(uri)] || uri);

                        // construct headers

                                this._index[fn] = this._index[fn] || {};
                                var cache = this._index[fn];

                                try {
                                        cache.content = cache.content || fs.readFileSync(fn);
                                        cache.digest = cache.digest || crypto.createHash('sha1').update(cache.content).digest('hex');
                                        cache.mtime = cache.mtime || fs.statSync(fn).mtime;
                                } catch (e) {
                                        throw e;
                                        response.writeHead(404, {});
                                        return response.end();
                                }

                        var data = echtzeit.util.createCachedReadStream(fn);

                        data.on("error", function () {
                                response.writeHead(404);
                        });

                        var headers = {
                                'ETag': cache.digest,
                                'Last-Modified': cache.mtime.toGMTString(),
                                "Content-type": /\.js$/.test(fn) ? 'text/javascript' : 'application/json'
                        };

                        if (request.headers['if-none-match'] === cache.digest
                                        || request.headers['if-modified-since'] && cache.mtime <= new Date(ims)) {
                                response.writeHead(304, headers), response.end();
                        } else {
                                headers['Content-Length'] = cache.content.length;
                                response.writeHead(200, headers);
                                data.pipe(response);
                        }
                }
        });
