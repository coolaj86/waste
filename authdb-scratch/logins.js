'use strict';

var authutils = require('./lib/utils-auth')
  , Promise = require('bluebird').Promise
  ;

module.exports.create = function (DB) {
  function Logins() {
  }

  Logins.get = function (loginObj) {
    return DB.Logins
      .forge({
        hashid: Logins.getHashid(loginObj)
      })
      .fetch({ withRelated: ['accounts'] })
      /*
      .on('query', function (stmt, vals) {
        console.log('[login] query');
        console.log(stmt);
        console.log(vals);
      })
      */
      ;
  };

  Logins.exists = function (loginObj) {
    return Logins.get(loginObj).then(function (login) {
      return !!login;
    });
  };

  Logins.getHashid = function (loginObj) {
    var hashid
      ;

    if (loginObj.__hashid) {
      return loginObj.__hashid;
    }

    if (!loginObj.type || !loginObj.uid) {
      throw new Error('Missing type and/or uid');
    }

    // TODO remove this check
    hashid = authutils.md5sum(loginObj.type + ':' + loginObj.uid);
    if (loginObj.__hashid && loginObj.__hashid !== hashid) {
      //console.log(loginObj.__hashid, hashid);
      throw new Error("hashid should be md5sum(type + ':' + uid)");
    }
    loginObj.__hashid = hashid;

    return loginObj.__hashid;
  };

  Logins.create = function (loginObj) {
    var login
      ;

    loginObj.hashid = Logins.getHashid(loginObj);

    login = DB.Logins
      .forge()
      ;

    return login.save(loginObj).then(function (login) {
      /*
      console.log('DB.Logins');
      console.log(DB.Logins);
      console.log('aaa');
      console.log(login);
      console.log("login.related('accounts')");
      console.log(login.related('accounts'));
      console.log(login.relations);
      */
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
        // UPSERT (Create or Update)
        if (!login) {
          //console.log('[login] need to create new record');
          return Logins.create(loginObj);
        }

        //console.log('[login] has existing record');
        return login;
      })
      ;
  };

  /*
  Logins.setPrimaryAccountWithoutSaving = function (logins, account) {
  };
  */

  Logins.setPrimaryAccount = function (logins, account) {
    var id = account.id || account
      , ps
      //, success = true
      ;

    if (!logins) {
      throw new Error('you must supply an array of logins to which to set the primary account');
    }

    if (!account) {
      throw new Error('you must supply an account to set as primary');
    }

    if (!Array.isArray(logins)) {
      logins = [logins];
    }

    ps = [];
    console.log('[logins]')
    logins.forEach(function (login) {
      var found
        ;

      console.log(login.related);
      login.related('accounts').some(function (account) {
        if (id === account.id) {
          found = true;
          return true;
        }
      });

      if (found) {
        login.set('primaryAccountId', id);
        ps.push(login.save());
        return;
      }

      ps.push(Promise.reject());
      //success = false;
      //return false;
    });

    return Promise.all(ps); // return success;
  };

  Logins.linkAccounts = function (logins, accounts) {
    var ps
      ;

    if (!logins) {
      throw new Error('you must supply an array of logins to link');
    }

    if (!accounts) {
      throw new Error('you must supply an array of accounts to link');
    }

    if (!Array.isArray(logins)) {
      logins = [logins];
    }

    if (!Array.isArray(accounts)) {
      accounts = [accounts];
    }

    ps = [];
    logins.forEach(function (login) {
      var accountsToLink = []
        ;

      accounts.forEach(function (account) {
        var found
          ;

        found = login.related('accounts').some(function (_account) {
          if (account.id === _account.id) {
            return true;
          }
        });

        if (!found) {
          accountsToLink.push(account);
        }
      });

      ps.push(login.related('accounts').attach(accountsToLink));
      /*
      ps.push(login.related('accounts').attach(accountsToLink).then(function (_login) {
        return _login.load('accounts');
      }));
      */
    });

    return Promise.all(ps);
  };

  Logins.unlinkAccounts = function (logins, accounts) {
    var ps
      ;

    if (!logins) {
      throw new Error('you must supply an array of logins to unlink');
    }

    if (!accounts) {
      throw new Error('you must supply an array of accounts to unlink');
    }

    if (!Array.isArray(logins)) {
      logins = [logins];
    }

    if (!Array.isArray(accounts)) {
      accounts = [accounts];
    }

    ps = [];
    logins.forEach(function (login) {
      var accountsToUnlink = []
        ;

      accounts.forEach(function (account) {
        var found
          ;

        found = login.related('accounts').some(function (_account) {
          if (account.id === _account.id) {
            return true;
          }
        });

        if (found) {
          accountsToUnlink.push(account);
        }
      });

      ps.push(login.related('accounts').detach(accountsToUnlink));
    });

    return Promise.all(ps);
  };

  return Logins;
};
