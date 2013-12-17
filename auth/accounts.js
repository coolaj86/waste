'use strict';

var UUID = require('node-uuid')
  , fs = require('fs')
  ;

module.exports.create = function (opts) {
  var Accounts = {}
    , cache = {}
    ;

  Accounts.create = function (user, ids) {
    var uuid = UUID.v4()
      ;

    // TODO better typing
    cache[uuid] = { uuid: uuid, ids: ids, user: user };

    return cache[uuid];
  };

  Accounts.read = function (uuid) {
    return cache[uuid];
  };
  Accounts.find = Accounts.read;

  return Accounts;
};
