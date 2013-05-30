echtzeit.Namespace = echtzeit.Class({
  initialize: function() {
    this._used = {};
  },

  exists: function(id) {
    return this._used.hasOwnProperty(id);
  },

  generate: function() {
    var name = echtzeit.random();
    while (this._used.hasOwnProperty(name))
      name = echtzeit.random();
    return this._used[name] = name;
  },

  release: function(id) {
    delete this._used[id];
  }
});

