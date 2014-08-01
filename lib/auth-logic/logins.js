'use strict';

// TODO find a way to handle the type mess
var authutils = require('./utils-auth')
  ;

module.exports.create = function (DB, _provider_) {
  var Promise = require('bluebird').Promise
    , _p
    ;

  function Logins(provider) {
    var me = this
      ;

    if (!(me instanceof Logins)) {
      return new Logins(provider);
    }

    me._provider = provider;
  }
  Logins.create = Logins.Logins = Logins;
  _p = Logins.prototype;
  _p.Logins = Logins;

  _p.get = function (loginObj) {
    var me = this
      , q = { hashid: me.getHashid(loginObj) }
      ;

    return DB.Logins
      .forge(q)
      .fetch({ withRelated: ['accounts'] })
      .then(function (login) {
        return login;
      })
      /*
      .on('query', function (stmt, vals) {
        console.log('[login] query');
        console.log(stmt);
        console.log(vals);
      })
      */
      ;
  };

  _p.exists = function (loginObj) {
    var me = this
      ;

    return me.get(loginObj).then(function (login) {
      return !!login;
    });
  };

  _p.getHashid = function (loginObj) {
    var me = this
      , hashid
      ;

    // TODO ensure that we always use one or the other
    if (loginObj.hashid || loginObj.id) {
      return loginObj.hashid || loginObj.id;
    }

    loginObj.type = me._provider || loginObj.type;

    if (!loginObj.type || !loginObj.uid) {
      console.error('Missing type and/or uid');
      console.error(loginObj.type, loginObj);
      throw new Error('Missing type and/or uid');
    }

    // TODO remove this check
    hashid = authutils.md5sum(loginObj.type + ':' + loginObj.uid);
    if (loginObj.hashid && loginObj.hashid !== hashid) {
      throw new Error("hashid should be md5sum(type + ':' + uid)");
    }
    loginObj.hashid = hashid;

    return loginObj.hashid;
  };

  _p.create = function (loginObj) {
    var me = this
      , login
      ;

    loginObj.hashid = me.getHashid(loginObj);

    login = DB.Logins
      .forge()
      ;

    return login.save(loginObj).then(function (login) {
      return login.load(['accounts']);
    });
  };

  _p.login = function (loginObj) {
    var me = this
      ;

    // this function is localized to each type of login
    // local/basic, oauth, oauth2, etc
    if ('function' === typeof loginObj.get) {
      return loginObj.load(['accounts']).then(function (login) {
        return login;
      });
    }

    return me.get(loginObj)
      .then(function (login) {
        // UPSERT (Create or Update)
        if (!login) {
          return me.create(loginObj);
        }

        return login;
      })
      ;
  };

  _p.msetPrimaryAccount = function (logins, account) {
    var id = account.id || account
      , ps
      //, success = true
      ;

    if (!logins || !Array.isArray(logins)) {
      throw new Error('you must supply an array of logins to which to set the primary account');
    }

    if (!account) {
      throw new Error('you must supply an account to set as primary');
    }

    ps = [];
    logins.forEach(function (login) {
      var found
        ;

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
      } else {
        console.warn("didn't find primary account in related('accounts')");
      }

      ps.push(Promise.reject());
      //success = false;
      //return false;
    });

    return Promise.all(ps); // return success;
  };

  _p.setPrimaryAccount = function (login, account) {
    var me = this
      ;

    if (Array.isArray(login)) {
      return me.msetPrimaryAccount(login, account);
    }

    return me.msetPrimaryAccount([login], account).then(function (logins) {
      return logins[0];
    });
  };

  _p.mget = function (logins) {
    var me = this
      , ps = []
      ;

    logins.forEach(function (loginObj) {
      if ('string' === typeof loginObj) {
        ps.push(me.get({ hashid: loginObj }));
      } else if ('object' === typeof loginObj) {
        loginObj.type = me._provider || loginObj.type;
        if ((loginObj.type && loginObj.uid) || (loginObj.hashid || loginObj.id)) {
          ps.push(me.get(loginObj));
        } else {
          console.error('[ERROR] [auth-logic] missing id stuff');
          console.error(loginObj);
          ps.push(Promise.reject(new Error('bad login type')));
        }
      }
    });

    return Promise.all(ps);
  };

  _p.mlinkAccounts = function (_logins, accounts) {
    var ps
      , logins = _logins
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

      if (!login) {
        console.error("null login in set");
        console.error(logins);
        console.error(_logins);
        ps.push(Promise.reject(new Error("null login in set")));
        return;
      }

      ps.push(login.related('accounts').attach(accountsToLink));
      /*
      ps.push(login.related('accounts').attach(accountsToLink).then(function (_login) {
        return _login.load('accounts');
      }));
      */
    });

    return Promise.all(ps).then(function () {
      return logins;
    });
  };
  _p.linkAccounts = function (login, accounts) {
    return _p.mlinkAccounts([login], accounts).then(function (logins) {
      return logins[0];
    });
  };

  _p.unlinkAccounts = function (logins, accounts) {
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

  return Logins.create(_provider_);
};
