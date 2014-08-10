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

      console.log('1');
      login.related('accounts').some(function (account) {
      console.log('1.1');
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
        console.log("didn't find primary account in related('accounts')");
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

  _p.letPrimaryAccount = function (login, account) {
    var found
      , primaryAccountId = login.get('primaryAccountId')
      ;

    // see if there is a primaryAccount and if it is set properly
    if (primaryAccountId) {
      console.log('2');
      found = login.related('accounts').some(function (a) {
        console.log('2.2');
        if (primaryAccountId === a.id) {
          return true;
        }
      });

      if (found) {
        return Promise.resolve(login);
      }
    }

    // see if the new primary account is already in the set
    console.log('3');
    found = login.related('accounts').some(function (a) {
      console.log('3.3');
      if (account.id === a.id) {
        return true;
      }
    });

    if (!found) {
      throw new Error("tried to set primary account, but it is not attached");
    }

    return login.set('primaryAccountId', account.id).save();
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
    console.log('mlink accounts');
    var ps
      , logins = _logins
      ;

    if (!Array.isArray(logins)) {
      throw new Error('you must supply an array of logins to link');
    }

    if (!Array.isArray(accounts)) {
      throw new Error('you must supply an array of accounts to link');
    }

    ps = [];
    logins.forEach(function (login) {
      ps.push(_p.linkAccounts(login, accounts));
    });

    return Promise.all(ps).then(function () {
      return logins;
    });
  };
  _p.linkAccounts = function (login, accounts) {
    var accountsToLink = []
      ;

    if (!Array.isArray(accounts)) {
      throw new Error('you must supply an array of accounts to link');
    }

    if (!login) {
      console.error("null login");
      //console.error(logins);
      //console.error(_logins);
      return Promise.reject(new Error("null login"));
    }

    accounts.forEach(function (account) {
      var found
        ;

      console.log('4');
      found = login.related('accounts').some(function (_account) {
        console.log('4.4');
        if (account.id === _account.id) {
          return true;
        }
      });

      if (!found) {
        accountsToLink.push(account);
      }
    });

    if (!accountsToLink.length) {
      return login;
    }

    console.log('5');
    return login.related('accounts').attach(accountsToLink).then(function (/*notlogin*/) {
      console.log('5.5');
      console.log('the single got done');
      console.log('6');
      if (!login.related('accounts').length) {
        console.log('6.6');
        throw new Error("Needs cremé de FML relief.");
      }
      return login;
    });

    /*
    ps.push(login.related('accounts').attach(accountsToLink).then(function (_login) {
      return _login.load('accounts');
    }));
    */
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

        console.log('7');
        found = login.related('accounts').some(function (_account) {
          console.log('7.7');
          if (account.id === _account.id) {
            return true;
          }
        });

        if (found) {
          accountsToUnlink.push(account);
        }
      });

      console.log('8');
      ps.push(login.related('accounts').detach(accountsToUnlink));
      console.log('8.8');
    });

    return Promise.all(ps);
  };

  return Logins.create(_provider_);
};