'use strict';

// Use cases to support
// * I want to create a new account using local login only
// * I want to create a new account using facebook and local login is required
// * I want to link an account to a new login (facebook, twitter, or otherwise) with existing login
// * I want to link an account to a new login (facebook, twitter, or otherwise) with a new login

module.exports.create = function (app, config, Auth, manualLogin) {
  app.use('/accounts', function (req, res, next) {
    if (!(req.user && req.user.mostRecentLoginId && req.user.login)) {
      if (!(req.body.authId && req.body.authSecret && req.body.email)) {
        res.send({ error: { message: "There is no current login (i.e. via Facebook), "
                              + "nor were local login details supplied (i.e. id, secret, and email)" } });
        return;
      }
    }

    next();
  });

  function route(rest) {
    function createOrUpdateAccount(req, res, next) {
      if (!req.user.accountIds.length) {
        res.send({ error: { message: "NOT IMPLEMENTED" } });
        return;
        //createAccount(req, res, next);
      } else {
        updateAccount(req, res, next);
      }
    }
    rest.post('/me/account', createOrUpdateAccount);
    rest.post('/me', createOrUpdateAccount);

    function updateAccount(req, res) {
      res.send({ error: { message: "NOT IMPLEMENTED" } });
    }
    rest.post('/accounts/:accountId', updateAccount);

    function deleteLogin(req, res) {
      var loginId = req.params.loginId
        , accountId = req.user.account.id
        ;

      Auth.unlink(req.user, accountId, loginId, function () {
        res.redirect(303, config.apiPrefix + '/session');
      });
    }
    rest.delete('/me/account/logins/:loginId', deleteLogin);
    rest.delete('/me/logins/:loginId', deleteLogin);

    function createAccount(explicitCreate, user, body, authId, authSecret, manualLoginWrapped, cb) {
      Auth.Users.exists('local' + ':' + authId, function (exists) {
        var opts = { method: explicitCreate ? 'create' : 'upsert' }
          // Should create a new account with the specified metadata and logins
          , meta = {}
          //, mostRecentLoginId = req.user.mostRecentLoginId
          ;

        function createLocalLogin(opts) {
          // TODO move into sessionlogic/local?
          var secretHash = require('./sessionlogic/utils').createSecretHash(authSecret)
            , accountIds = []
            ;

          if (user.account && 'undefined' !== typeof user.account.id) {
            accountIds.push(user.account.id);
          }

          Auth.Logins.create({
            type: 'local'
          , uid: authId
          , profile: {
              id: authId
            }
          , salt: secretHash.salt
          , secret: secretHash.secret
          , hashtype: secretHash.type
          , accountIds: accountIds
          , primaryAccountId: accountIds[0]
          }, function (/*login*/) {
            if (!user) {
              manualLoginWrapped(null, body, authId, authSecret, attachLocalLoginWithUser);
            } else {
              attachLocalLogin(opts);
            }
          });
        }

        function attachLocalLoginWithUser(err, _user) {
          /*
          console.log('#################### (old) user');
          console.log(user);
          console.log('#################### (new) user');
          console.log(_user);
          */
          user = user || _user;

          function setMeta(meta, other) {
            Object.keys(other).forEach(function (k) {
              meta[k] = other[k];
            });

            if (!meta.localLoginId && /local/.test(user.login.id)) {
              meta.localLoginId = user.login.id;
            } else if (meta.localLoginId && !/local/.test(user.login.id)) {
              meta.localLoginId = null;
            }
          }

          setMeta(meta, body);

          // TODO reserialize?
          //user.mostRecentLoginId = mostRecentLoginId || user.mostRecentLoginId;
          //user.login = login || user.login;

          function setPrimaryAccount(account) {
            user.logins.forEach(function (l) {
              console.log('login');
              console.log(l);
              if (!l.primaryAccountId) {
                Auth.Logins.setPrimaryAccount(l, account);
              }
            });
          }

          function createNewAccount() {
            Auth.Accounts.create(user.logins.map(function (l) { return l.id; }), meta, function (account) {
              mergeExistingAccount(account);
            });
          }

          function mergeExistingAccount(account) {
            Auth.Accounts.attachLogin(account, user.login);
            setPrimaryAccount(account);
            cb();
          }

          if ('create' === opts.method) {
            console.log('[account] create new (explicit)');
            createNewAccount();
            return;
          }

          if (!user.accounts.length) {
            console.log('[account] create new (no accounts)');
            createNewAccount();
            return;
          }

          console.log('[account] merge existing');
          if (!user.account) {
            user.account = user.accounts[0];
          }
          if (!user.account) {
            console.log("[account] CAN'T merge existing");
            createNewAccount();
          } else {
            mergeExistingAccount(user.account);
          }
        }

        function attachLocalLogin() {
          // sends error directly when login is invalid

          manualLoginWrapped(user, body, authId, authSecret, attachLocalLoginWithUser);
          //manualLogin(authId, authSecret, req, res, onLogin);
        }


        if (exists) {
          attachLocalLogin();
        } else {
          createLocalLogin();
        }
      });
    }

    rest.post('/accounts/:new?', function (req, res) {
      var body = req.body
        , authId = body.authId
        , authSecret = body.authSecret
        , user = req.user
        ;

      delete body.authId;
      delete body.authSecret;

      body.role = 'user';
      if (!Array.isArray(body.loginIds)) {
        // TODO make ids into objects containing id and allow nullifying of id
        body.loginIds = [];
      }

      function manualLoginWrapped(user, body, authId, authSecret, onLogin) {
        // TODO fake the req object and replace res with a callback?
        // TODO or rename to createManualLogin and return such a function?
        manualLogin(authId, authSecret, req, res, onLogin);
      }

      createAccount(req.params.new, user, body, authId, authSecret, manualLoginWrapped, function () {
        //res.url = '/session';
        //next();
        res.redirect(config.apiPrefix + '/session');
        //res.send(account);
      });
    });
  }

  return {
    route: route
  };
};
