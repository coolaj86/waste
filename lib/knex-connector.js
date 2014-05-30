'use strict';

var Knex = require('knex')
  , path = require('path')
  ;

module.exports.knex = Knex.initialize({
  client: 'sqlite3'
, connection: {
    filename : path.join(__dirname, '..', 'priv', 'storage.sqlite3')
  , debug: true
  }
});
