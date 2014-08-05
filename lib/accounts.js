'use strict';

module.exports.create = function (app, config, Auth, manualLogin) {
  var Promise = require('bluebird').Promise
    ;

  // I'm fairly certain that res.send() will never be called
  // because I'm overwriting passport's default behavior in
  // sessionlogic/local.js an provide my own handler in sessionlogic/index.js
  // 
  // Remember that passport was designed to be used with connect,
  // so if there's a bug where the promise is never fulfilled, it's worth
  // looking here to see if this is the culprit.
  function wrapManualLogin(req, res) {
    return function (uid, secret) {
      return new Promise(function (resolve, reject) {
        manualLogin(uid, secret, req, res, function (err, user) {
          if (err) {
            reject(err);
            return;
          }

          console.log('[accounts] [user]');
          console.log(user);
          resolve(user);
        }, { wrapped: true });
      });
    };
  }

  function LocalAccounts() {
  }
  LocalAccounts.create = function (accountObj, loginObjs) {
    // for this implementation we require that an account always
    // be linked to a login (which makes sense, because you can't access it otherwise)

    return Auth.Accounts.create(accountObj).then(function (account) {
      // TODO make sure the logins are either new or in the current session before we even get here
      return Auth.Logins.mlogin(loginObjs).then(function (logins) {
        return Auth.Logins.mlinkAccounts(logins, account).then(function () {
        });
      });
    });
  };

  function validateLogins(curLogins, newLogins, wrappedManualLogin) {
    var ps = []
      ;

    function isNewLogin(newLogin) {
      return !(newLogin.id || newLogin.hashid) && newLogin.uid && newLogin.secret;
    }

    // Logins must be in the current session OR new local logins
    function isCurrentLogin(newLogin) {
      return curLogins.some(function (login) {
        if ((login.hashid || login.id) === (newLogin.hashid || newLogin.id)) {
          return true;
        }
      });
    }

    newLogins.forEach(function (newLogin) {
      if (isCurrentLogin(newLogin)) {
        console.log('Auth.Logins.login', newLogin);
        ps.push(Auth.Logins.login(newLogin));
        return;
      }

      /*
      if (isNewLogin(newLogin)) {
        // TODO make logging in not a big deal
        // TODO config.apiPrefix
        ps.push(Promise.reject(new Error("This login is not in your session. POST uid and secret to /api/session/local or HTTP auth to /api/session/basic first and then try again. We don't do this for you because the process of adding a login to your session manually outside of the session handler is... not as amazingly simple as it should be.")));
      }
      */

      if (!isNewLogin(newLogin)) {
        ps.push(Promise.reject(new Error("This login was not new, but was not in the session")));
        return;
      }

      // TODO support other types of local login here? (oauth, sms, email)... prolly not
      console.log('Auth.LocalLogin.create', newLogin);
      ps.push(Auth.LocalLogin.create(newLogin).then(function (login) {
        console.log("login.get('uid')");
        console.log(login.get('uid'));
        return wrappedManualLogin(login.get('uid'), newLogin.secret).then(function () {
          // TODO TODO TODO
          return login;
        });
      }));
    });

    return Promise.all(ps);
  }

  function validateAccounts(curAccounts, newAccounts) {
    var ps = []
      ;

    function isNewAccount(newAccount) {
      return !(newAccount.id || newAccount.uuid);
    }

    // Logins must be in the current session OR new local logins
    function isCurrentAccount(newAccount) {
      return curAccounts.some(function (account) {
        if ((account.uuid || account.id) === (newAccount.uuid || newAccount.id)) {
          return true;
        }
      });
    }

    newAccounts.forEach(function (newAccount) {
      if (isCurrentAccount(newAccount)) {
        console.log("Auth.Accounts.get(newAccount)");
        console.log(Auth.Accounts.get(newAccount));
        ps.push(Auth.Accounts.get(newAccount));
        return;
      }

      if (!isNewAccount(newAccount)) {
        ps.push(Promise.reject(new Error("This account is not new, but was not in the session")));
        return;
      }

      // TODO support other types of local login here? (oauth, sms, email)... prolly not
      ps.push(Auth.Accounts.create(newAccount));
    });

    return Promise.all(ps);
  }

  function Logins() {
  }
  Logins.restful = {};

  // TODO handle 0+ accounts and 0-1 primaryAccountId
  Logins.restful.create = function (req, res) {
    var authId = req.body.uid
      , authSecret = req.body.secret
      , manualLoginWrapped = wrapManualLogin(req, res)
      ;

    Auth.LocalLogin.create(req.body)
      .then(function (/*login*/) {
        return manualLoginWrapped(authId, authSecret);
      })
      .then(
        function () {
          res.redirect(303, config.apiPrefix + '/session');
        }
      , function (err) {
          res.send({ error: { 
            message: err && err.message || "couldn't create login nor use the supplied credentials"
          } });
        }
      );
  };

  function Accounts() {
  }
  Accounts.restful = {};

  // TODO handle account and 0+ logins
  Accounts.restful.create = function (req, res) {
    var newLogins = req.body.logins || []
      , loginIds = {}
      , newAccount = req.body
        // TODO no no no
      , newAccounts = newAccount.accounts
      , curLogins = req.user && req.user.logins || []
      , curAccounts = req.user && req.user.accounts || []
      ;

    // TODO remove
    newAccount = newAccounts && newAccounts[0] || newAccount;
    newLogins = newAccounts.logins || newLogins;
    delete newAccount.logins;

    newLogins = newLogins.filter(function (login) {
      // TODO make error
      if (login.id && loginIds[login.id]) {
        return false;
      }
      loginIds[login.id] = true;
      return true;
    });

    if (newAccount.id) {
      res.send({ error: { message: "You may not supply your own account id when creating an account", code: 501 } });
      return;
    }

    validateLogins(curLogins, newLogins, wrapManualLogin(req, res)).then(function (logins) {
      console.log('[accounts] logins');
      console.log(logins);
      return validateAccounts(curAccounts, [newAccount]).then(function (accounts) {
        console.log('[accounts] accounts');
        console.log(accounts);
        return Auth.link(accounts, logins);
      });
    }).then(function () {
      // TODO don't resend entire session
      //res.send({ success: true });
      res.redirect(303, config.apiPrefix + '/session');
    }, function (err) {
      res.send({ error: { message: err && err.message || "invalid logins or accounts" } });
    });
  };
  Accounts.restful.getSelected = function (req, res) {
    var account
      ;

    if (1 === req.user.accounts.length) {
      // TODO why did this not have a primary account id?
      account = req.user.accounts[0];
    } else {
      req.user.accounts.forEach(function (a) {
        if (a.id === req.user.selectedAccountId) {
          account = a;
        }
      });
    }

    console.log("[accounts.js] account - --------------------------");
    console.log(account);
    res.send(account);
  };

  function route(rest) {
    // TODO modify account data and link logins
    rest.post('/accounts/:uuid', function (req, res) {
      res.send({ error: { message: "Modifying Account Not Implemented", code: 501 } });
    });

    // TODO modify login data and link accounts
    rest.post('/logins/:hashid', function (req, res) {
      res.send({ error: { message: "Modifying Login Not Implemented", code: 501 } });
    });

    rest.post('/logins', Logins.restful.create);

    // TODO only one account
    rest.post('/accounts', Accounts.restful.create);

    rest.get('/me', Accounts.restful.getSelected);
  }

  return {
    route: route
  };
};
