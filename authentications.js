'use strict';

var Bookshelf = require('bookshelf')
  ;

var Sqlite3 = Bookshelf.initialize({
  client: 'sqlite3',
  connection: {
    filename: 'authentications.sqlite3'
  }
});

var Users = Sqlite3.Model.extend({
  tableName: 'users'
});

Users.forge({ id: 'foobar@gmail.com' }).destroy().then(function () {
  Users.forge({ id: 'foobar@gmail.com' }).save({ salt: 'yayaya' }, { method: 'insert' }).then(function () {
    Users.collection().fetch().then(function (collection) {
      collection.forEach(function (item) {
        console.log(JSON.stringify(item, null, '  '));
      });
    });
  }, function () {
    console.log('had error');
  });
}, function () {
  console.log('no destroy');
});

Users.collection().query(function (qb) {
  qb.where('id', '=', 'coolaj86@gmail.com');
}).fetchOne().then(function (item) {
  console.log(JSON.stringify(item, null, '  '));
});
