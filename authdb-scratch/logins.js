'use strict';

var authutils = require('./lib/utils-auth')
  ;

module.exports.create = function (DB) {
  function Logins() {
  }

  Logins.get = function (loginObj) {
    return DB.Logins
      .forge({ typedUid: Logins.getTypedUid(loginObj) })
      .fetch({ withRelated: ['accounts'] })
      ;
  };

  Logins.exists = function (loginObj) {
    return Logins.get(loginObj).then(function (login) {
      return !!login;
    });
  };

  Logins.getTypedUid = function (loginObj) {
    var typedUid
      ;

    if (loginObj.__typedUid) {
      return loginObj.__typedUid;
    }

    if (!loginObj.type || !loginObj.uid) {
      throw new Error('Missing type and/or uid');
    }

    // TODO remove this check
    typedUid = authutils.md5sum(loginObj.type + ':' + loginObj.uid);
    if (loginObj.__typedUid && loginObj.__typedUid !== typedUid) {
      console.log(loginObj.__typedUid, typedUid);
      throw new Error("typedUid should be md5sum(type + ':' + uid)");
    }
    loginObj.__typedUid = typedUid;

    return loginObj.__typedUid;
  };

  Logins.create = function (loginObj) {
    var login
      ;

    loginObj.typedUid = Logins.getTypedUid(loginObj);

    login = DB.Logins.forge();

    return login.save(loginObj).then(function (login) {
      console.log('DB.Logins');
      console.log(DB.Logins);
      console.log('aaa');
      console.log(login);
      console.log("login.related('accounts')");
      console.log(login.related('accounts'));
      console.log(login.relations);
      return login.load(['accounts']);
    });
  };

  Logins.login = function (loginObj) {
    // this function is localized to each type of login
    // local/basic, oauth, oauth2, etc
    if ('function' === typeof loginObj.get) {
      return loginObj.load(['accounts']).then(function (login) {
        return login;
      });
    }

    return Logins.get(loginObj)
      .then(function (login) {
        if (!login) {
          console.log('[login] need to create new record');
          return Logins.create(loginObj);
        }

        console.log('[login] has existing record');
        return login;
      })
      ;
  };


  Logins.linkAccounts = function (logins, accounts) {
    throw new Error('Not Implemented: Logins.linkLogins()');
  };

  Logins.unlinkAccounts = function (logins, accounts) {
    throw new Error('Not Implemented: Logins.unlinkLogins()');
  };

  return Logins;
};
