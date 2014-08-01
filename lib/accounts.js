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

  function route(rest) {
    rest.post('/accounts/:uuid', function (req, res) {
      res.send({ error: { message: "Modifying Account Not Implemented", code: 501 } });
    });
    rest.post('/logins/:hashid', function (req, res) {
      res.send({ error: { message: "Modifying Login Not Implemented", code: 501 } });
    });

    rest.post('/logins', function (req, res) {
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
    });

    rest.post('/accounts', function (req, res) {
      var newLogins = req.body.logins || []
        , loginIds = {}
        , accountIds = {}
        , newAccounts = req.body.accounts || []
        , curLogins = req.user && req.user.logins || []
        , curAccounts = req.user && req.user.accounts || []
        ;

      newLogins = newLogins.filter(function (login) {
        // TODO make error
        if (login.id && loginIds[login.id]) {
          return false;
        }
        loginIds[login.id] = true;
        return true;
      });

      newAccounts = newAccounts.filter(function (account) {
        // TODO make error
        if (account.id && accountIds[account.id]) {
          return false;
        }
        accountIds[account.id] = true;
        return true;
      });

      validateLogins(curLogins, newLogins, wrapManualLogin(req, res)).then(function (logins) {
        console.log('[accounts] logins');
        console.log(logins);
        return validateAccounts(curAccounts, newAccounts).then(function (accounts) {
          console.log('[accounts] accounts');
          console.log(accounts);
          return Auth.link(accounts, logins);
        });
      }).then(function () {
        //res.send({ success: true });
        res.redirect(303, config.apiPrefix + '/session');
      }, function (err) {
        res.send({ error: { message: err && err.message || "invalid logins or accounts" } });
      });
    });
  }

  return {
    route: route
  };
};
