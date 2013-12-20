'use strict';

var UUID = require('node-uuid')
  , fs = require('fs')
  ;

module.exports.create = function (opts) {
  var Accounts = {}
    , cache = {}
    ;

  Accounts.create = function (loginIds, meta) {
    var uuid = UUID.v4()
      ;

    // TODO better typing
    cache[uuid] = { uuid: uuid, loginIds: loginIds };
    Object.keys(meta).forEach(function (key) {
      if ('uuid' !== key && 'loginIds' !== loginIds) {
        cache[uuid][key] = meta[key];
      }
    });

    return cache[uuid];
  };

  Accounts.addLoginId = function (accountId, loginId) {
    var account = cache[accountId]
      ;
      
    if (-1 === account.loginIds.indexOf(loginId)) {
      account.loginIds.push(loginId);
    }
  };

  Accounts.read = function (uuid) {
    return cache[uuid];
  };
  Accounts.find = Accounts.read;

  return Accounts;
};
