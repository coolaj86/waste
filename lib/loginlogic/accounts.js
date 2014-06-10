'use strict';

var UUID = require('node-uuid')
  , fs = require('fs')
  ;

module.exports.create = function (opts) {
  var Accounts = {}
    , dbpath = opts.dbfile
    , cache
    , db = null // TODO opts.db
    ;

  try {
    cache = require(opts.dbfile);
  } catch(e) {
    console.log("Couldn't find accounts db file '" + opts.dbfile + "'. Creating anew...");
    cache = {};
  }

  function save(account) {
    if (dbpath) {
      // TODO check log and reduce number of saves
      // console.log("saving accounts db file", dbpath);
      cache[account.id || account.uuid] = account;
      fs.writeFileSync(dbpath, JSON.stringify(cache, null, '  '), 'utf8');
    } else {
      db.put(account.id || account.uuid, account);
    }
  }


  Accounts.create = function (loginIds, meta, cb) {
    var uuid = UUID.v4()
      , account
      ;

    // TODO better typing
    account = { id: uuid, uuid: uuid, loginIds: loginIds };
    Object.keys(meta).forEach(function (key) {
      if (-1 === ['id', 'uuid', 'loginIds'].indexOf(key)) {
        account[key] = meta[key];
      }
    });

    save(account);

    if (cb) {
      cb(account);
    }
    return account;
  };

  Accounts.link = Accounts.addLoginId = function (accountId, loginId, cb) {
    var account = cache[accountId]
      ;
      
    if (-1 === account.loginIds.indexOf(loginId)) {
      account.loginIds.push(loginId);
      save(account);
    }

    if (cb) {
      cb();
    }
  };

  Accounts.select = function (id, accounts) {
    var account
      ;

    accounts.some(function (a) {
      if (id === a.id || id === a.uuid) {
        account = a;
        return true;
      }
    });

    return account;
  };

  Accounts.attachLogin = function (account, login, cb) {
    function hasLogin(loginId) {
      if (loginId === login.id) {
        return true;
      }
    }

    if (!account.loginIds.some(hasLogin)) {
      account.loginIds.push(login.id);
      save(account);
    }

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
