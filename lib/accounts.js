'use strict';

module.exports.create = function (app, config, Auth, manualLogin) {
  app.use('/accounts', function (req, res, next) {
    if (!(req.user && req.user.mostRecentLoginId && req.user.login)) {
      res.send({ error: { message: "NO LOGIN" } });
      return;
    }

    next();
  });

  function route(rest) {
    function createOrUpdateAccount(req, res, next) {
      if (!req.user.accountIds.length) {
        createAccount(req, res, next);
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

    function createAccount(user, body, authId, authSecret, manualLoginWrapped, cb) {
      // Should create a new account with the specified metadata and logins
      var meta = {}
        //, mostRecentLoginId = req.user.mostRecentLoginId
        ;

      function createLocalLogin() {
        // TODO move into sessionlogic/local?
        var secretHash = require('./sessionlogic/utils').createSecretHash(authSecret)
          ;

        Auth.Logins.create({
          type: 'local'
        , uid: authId
        , profile: {
            id: authId
          }
        , salt: secretHash.salt
        , secret: secretHash.secret
        , hashtype: secretHash.type
        , accountIds: []
        }, function (/*login*/) {
          attachLocalLogin();
        });
      }

      function attachLocalLogin() {
        // sends error directly when login is invalid
        function onLogin() {
          Object.keys(body).forEach(function (k) {
            meta[k] = body[k];
          });

          if (!meta.localLoginId && /local/.test(user.login.id)) {
            meta.localLoginId = user.login.id;
          } else if (meta.localLoginId && !/local/.test(user.login.id)) {
            meta.localLoginId = null;
          }

          // TODO reserialize?
          //user.mostRecentLoginId = mostRecentLoginId || user.mostRecentLoginId;
          //user.login = login || user.login;

          Auth.Accounts.create(user.logins.map(function (l) { return l.id; }), meta, function (account) {
            user.logins.forEach(function (l) {
              console.log('login');
              console.log(l);
              if (!l.primaryAccountId) {
                Auth.Logins.setPrimaryAccount(l, account);
              }
            });

            cb();
          });
        }

        manualLoginWrapped(user, body, authId, authSecret, onLogin);
        //manualLogin(authId, authSecret, req, res, onLogin);
      }

      Auth.Users.exists('local' + ':' + authId, function (exists) {
        if (exists) {
          attachLocalLogin();
        } else {
          createLocalLogin();
        }
      });
    }

    rest.post('/accounts', function (req, res) {
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
        manualLogin(authId, authSecret, req, res, onLogin);
      }
      createAccount(user, body, authId, authSecret, manualLoginWrapped, function () {
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
