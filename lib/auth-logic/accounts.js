'use strict';

var UUID = require('node-uuid')
  ;

/*
function logQuery(params) {
  console.log('[log] [accounts] sql');
  console.log(params);
}
*/

module.exports.create = function (DB) {
  var Promise = require('bluebird').Promise
    ;

  function Accounts() {
  }

  Accounts.create = function (stuff) {
    var account
      , uuid
      ;

    if (stuff.uuid) {
      throw new Error('uuids are assigned by the accounts, not by you');
    }

    uuid = UUID.v4();
    //stuff.uuid = uuid;
    account = DB.Accounts.forge(stuff);

    return account/*.on('query', logQuery)*/.save({ uuid: uuid }, { method: 'insert' });
  };

  Accounts.get = function (uuid) {
    if (Array.isArray(uuid)) {
      return Accounts.mget(uuid);
    } else {
      return Accounts.mget([uuid]).then(function (accounts) {
        return accounts[0];
      });
    }
  };

  Accounts.mget = function (uuids) {
    var accounts = []
      , ps = []
      ;

    if (0 === uuids.length) {
      return accounts;
    }

    uuids.forEach(function (uuid) {
      if ('string' !== typeof uuid) {
        // if the objects have already been retrieved as objects
        ps.push(uuid);
        return;
      }

      ps.push(DB.Accounts.forge({ id: uuid }).fetch());
    });

    return Promise.all(ps);
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

  // TODO probably only do this from the perspective of a login
  /*
  Accounts.linkLogins = function (accounts, logins) {
    throw new Error('Not Implemented: Accounts.linkLogins()');
  };

  Accounts.linkLogins = function (accounts, logins) {
    throw new Error('Not Implemented: Accounts.unlinkLogins()');
  };
  */

  return Accounts;
};
