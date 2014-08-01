'use strict';

module.exports.create = function (Db/*, config*/) {
  var Logins = require('./logins').create(Db)
    , Accounts = require('./accounts').create(Db)
    , LocalLogin = require('./locals').create(Logins.Logins.create('local'))
    , BearerLogin = require('./bearers').create(Logins.Logins.create('bearer'))
    ;

  function deserialize(sessionIds, done) {
    return Logins.mget(sessionIds.loginIds).then(function (logins) {
      var accounts = []
        , account
        , login
        ;

      logins.reduce(function (memo, login) {
        console.log('[related] authlogicindex 2', !!login, typeof login);
        login.related('accounts').forEach(function (account) {
          if (-1 === memo.indexOf(account.id)) {
            memo.push(account.id);
            accounts.push(account);
          }
        });

        return memo;
      }, []);

      if (!sessionIds.selectedAccountId) {
        logins.some(function (login) {
          if (login.id === sessionIds.mostRecentLoginId) {
            sessionIds.selectedAccountId = login.get('primaryAccountId');
            return true;
          }
        });
      }

      if (!sessionIds.selectedAccountId) {
        logins.some(function (login) {
          return (sessionIds.selectedAccountId = login.get('primaryAccountId'));
        });
      }

      accounts.forEach(function (a) {
        if (a.id === sessionIds.selectedAccountId) {
          account = a;
        }
      });

      logins.forEach(function (l) {
        if (l.id === sessionIds.mostRecentLoginId) {
          login = l;
        }
      });

      return {
        logins: logins
      , mostRecentLoginId: sessionIds.mostRecentLoginId
      , login: login
      , accounts: accounts
      , account: account
      , selectedAccountId: sessionIds.selectedAccountId
      };
    })
    .then(
      function (result) {
        done(null, result);
        return result;
      }
    , function (err) {
        done(err);
      }
    );
  }

  function serialize(sessionObj, done) {
    var sessionIds = { loginIds: [] }
      ;

    function handleNewLogin() {
      if (!sessionObj.newLogin) {
        return sessionObj.login;
      }

      return Logins.login(sessionObj.newLogin).then(function (newLogin) {
        delete sessionObj.newLogin;

        if (!sessionObj.logins.some(function (l) {
          if (l.id === newLogin.id) {
            return true;
          }
        })) {
          sessionObj.logins.push(newLogin);
        }

        sessionObj.login = newLogin;
        sessionObj.mostRecentLoginId = newLogin.id;

        if (!sessionObj.selectedAccountId) {
          sessionObj.selectedAccountId = newLogin.get('primaryAccountId');
        }

        console.log('[related] authlogicindex 0', !!newLogin, typeof newLogin);
        newLogin.related('accounts').forEach(function (account) {
          if (!sessionObj.accounts.some(function (_account) {
            return account.id === _account.id;
          })) {
            sessionObj.accounts.push(account);
          }
        });

        return newLogin;
      });
    }

    return handleNewLogin().then(function (login) {
      sessionIds.mostRecentLoginId = sessionObj.login.id;

      sessionIds.loginIds = sessionObj.logins.reduce(function (memo, l) {
        memo.push(l.id);
        return memo;
      }, []);

      if (-1 === sessionIds.loginIds.indexOf(login.id)) {
        sessionIds.loginIds.push(login.id);
      }

      sessionIds.selectedAccountId = sessionObj.account && sessionObj.account.id;
    }).then(function () {
      done(null, sessionIds);
      return sessionIds;
    });
  }

  function unlink(account, login) {
    return Logins.unlinkAccounts(login, account);
  }

  function link(accounts, logins) {
    return Logins.mlinkAccounts(logins, accounts);
  }

  return {
    serialize: serialize
  , deserialize: deserialize
  , unlink: unlink
  , link: link
  , Logins: Logins
  , Accounts: Accounts
  , LocalLogin: LocalLogin
  , BearerLogin: BearerLogin
  };
};
