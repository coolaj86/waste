'use strict';

var UUID = require('node-uuid')
  , fs = require('fs')
  ;

module.exports.create = function (opts) {
  var Accounts = {}
    , dbpath = opts.dbfile
    , cache
    ;

  try {
    console.log("Couldn't find accounts db file. Creating anew...");
    cache = require(opts.dbfile);
  } catch(e) {
    cache = {};
  }

  function save() {
    fs.writeFileSync(dbpath, JSON.stringify(cache, null, '  '), 'utf8');
  }


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

    save();
    return cache[uuid];
  };

  Accounts.addLoginId = function (accountId, loginId) {
    var account = cache[accountId]
      ;
      
    if (-1 === account.loginIds.indexOf(loginId)) {
      account.loginIds.push(loginId);
    }

    save();
  };

  Accounts.read = function (uuid) {
    return cache[uuid];
  };
  Accounts.find = Accounts.read;

  return Accounts;
};
