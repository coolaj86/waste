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
    rest.post('/me/account', function (req, res, next) {
      if (!req.user.accountIds.length) {
        createAccount(req, res, next);
      } else {
        updateAccount(req, res, next);
      }
    });

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

    function createAccount(req, res) {
      // Should create a new account with the specified metadata and logins
      var meta = {}
        , authId = req.body.authId
        , authSecret = req.body.authSecret
        //, mostRecentLoginId = req.user.mostRecentLoginId
        //, login = req.user.login
        ;

      delete req.body.authId;
      delete req.body.authSecret;
      req.body.role = 'user';
      if (!Array.isArray(req.body.loginIds)) {
        // TODO make ids into objects containing id and allow nullifying of id
        req.body.loginIds = [];
      }

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
          Object.keys(req.body).forEach(function (k) {
            meta[k] = req.body[k];
          });
          meta.localLoginId = req.user.login.id;

          // TODO reserialize?
          //req.user.mostRecentLoginId = mostRecentLoginId || req.user.mostRecentLoginId;
          //req.user.login = login || req.user.login;

          Auth.Accounts.create(req.user.logins.map(function (l) { return l.id; }), meta, function (account) {
            req.user.logins.forEach(function (l) {
              console.log('login');
              console.log(l);
              if (!l.primaryAccountId) {
                Auth.Logins.setPrimaryAccount(l, account);
              }
            });

            //res.url = '/session';
            //next();
            res.redirect(config.apiPrefix + '/session');
            //res.send(account);
          });
        }
        manualLogin(authId, authSecret, req, res, onLogin);
      }

      Auth.Users.exists('local' + ':' + authId, function (exists) {
        if (exists) {
          attachLocalLogin();
        } else {
          createLocalLogin();
        }
      });
    }
    rest.post('/accounts', createAccount);
  }

  return {
    route: route
  };
};
