'use strict';

var UUID = require('node-uuid')
  //, Promise = require('bluebird').Promise
  ;

module.exports.create = function (DB) {
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

    //console.log(uuid);
    //console.log(account.toJSON());
    function logQuery(stmt, vals) {
      console.log('[log] sql');
      console.log(stmt, vals);
    }

    return account.on('query', logQuery).save({ uuid: uuid }, { method: 'insert' });
  };

  Accounts.linkLogins = function (accounts, logins) {
    if (!accounts) {
      throw new Error('missing accounts to link');
    }

    if (!Array.isArray(accounts)) {
      accounts = [accounts];
    }

    if (!logins) {
      throw new Error('missing logins to link');
    }

    if (!Array.isArray(logins)) {
      logins = [logins];
    }

    // TODO loop through accounts and attach logins to them
    throw new Error('Not Implemented: Accounts.linkLogins()');
  };

  Accounts.linkLogins = function (accounts, logins) {
    throw new Error('Not Implemented: Accounts.unlinkLogins()');
  };

  return Accounts;
};
