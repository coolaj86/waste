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
    cache = require(opts.dbfile);
  } catch(e) {
    console.log("Couldn't find accounts db file '" + opts.dbfile + "'. Creating anew...");
    cache = {};
  }

  function save() {
    // TODO check log and reduce number of saves
    // console.log("saving accounts db file", dbpath);
    fs.writeFileSync(dbpath, JSON.stringify(cache, null, '  '), 'utf8');
  }


  Accounts.create = function (loginIds, meta, cb) {
    var uuid = UUID.v4()
      ;

    // TODO better typing
    cache[uuid] = { id: uuid, uuid: uuid, loginIds: loginIds };
    Object.keys(meta).forEach(function (key) {
      if ('uuid' !== key && 'loginIds' !== loginIds) {
        cache[uuid][key] = meta[key];
      }
    });

    save();

    if (cb) {
      cb(cache[uuid]);
    }
    return cache[uuid];
  };

  Accounts.link = Accounts.addLoginId = function (accountId, loginId, cb) {
    var account = cache[accountId]
      ;
      
    if (-1 === account.loginIds.indexOf(loginId)) {
      account.loginIds.push(loginId);
    }

    save();

    if (cb) {
      cb();
    }
  };

  Accounts.mget = function (uuids, cb) {
    var accounts = []
      , error = { message: "missing uuids", uuids: [] }
      ;

    if (0 === uuids.length) {
      cb(null, accounts);
      return;
    }

    if ('string' !== typeof uuids[0]) {
      // if the objects have already been retrieved as objects
      cb(null, uuids);
      return;
    }

    uuids.forEach(function (uuid) {
      if (cache[uuid]) {
        accounts.push(cache[uuid]);
      } else {
        error.uuids.push(uuid);
      }
    });

    cb(null, accounts);
  };
  Accounts.read = function (uuid) {
    return cache[uuid];
  };
  Accounts.find = Accounts.read;

  return Accounts;
};
