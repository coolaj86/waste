'use strict';

var Knex = require('knex')
  , path = require('path')
  ;

module.exports.create = function(thing) {
  var filename
    ;

  if (thing) {
    if ('object' === typeof thing) {
      return thing;
    }
    if ('string' === typeof thing) {
      filename = thing;
    }
  }

  return Knex.initialize({
    client: 'sqlite3'
  , connection: {
      filename : path.join(__dirname, '..', 'priv', filename || 'storage.sqlite3')
    , debug: true
    }
  });
};
