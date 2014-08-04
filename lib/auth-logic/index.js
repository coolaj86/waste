'use strict';

module.exports.create = function (Db, config) {
  var Logins = require('./logins').create(Db)
    , Accounts = require('./accounts').create(Db)
    , LocalLogin = require('./locals').create(Logins.Logins.create('local'))
      // TODO make separate tables for apps and bearers => logins.related('bearers').related('app')
    , BearerLogin = require('./bearers').create(Logins.Logins.create('bearer'), Logins.Logins.create('app'))
    , Oauth2ClientLogin = require('./oauth2-clients').create(Db, config, Logins.Logins.create('oauth2-client'))
    , Auth
    ;

  function deserialize(sessionIds, done) {
    return Logins.mget(sessionIds.loginIds).then(function (logins) {
      var accounts = []
        , account
        , login
        , accountIds
        ;

      accountIds = logins.reduce(function (memo, login) {
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

      if (!account) {
        sessionIds.selectedAccountId = null;
      }

      logins.forEach(function (l) {
        if (l.id === sessionIds.mostRecentLoginId) {
          login = l;
        }
      });

      if (!login) {
        sessionIds.mostRecentLoginId = null;
      }

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

      // whether this is JSON or bookshelf, it will become bookshelf
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

        // TODO remove
        if (newLogin.get('primaryAccountId') && !newLogin.related('accounts').length) {
          throw new Error('has primary account id, but no accounts');
        }
        newLogin.related('accounts').forEach(function (account) {
          // switch to the new account if there isn't a previous one
          if (!sessionObj.account && sessionObj.selectedAccountId === account.id) {
            sessionObj.account = account;
          }

          if (!sessionObj.accounts.some(function (_account) {
            return account.id === _account.id;
          })) {
            sessionObj.accounts.push(account);
          }
        });

        // TODO remove
        if (sessionObj.selectedAccountId && !sessionObj.account) {
          throw new Error('has selected account id with account after loop');
        }

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

      sessionIds.selectedAccountId = sessionObj.selectedAccountId;
    }).then(function () {
      // TODO remove
      if (sessionIds.selectedAccountId && !sessionObj.account) {
        throw new Error('has selectedAccountId but no sessionIds.account');
      }
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

  Auth = {
    serialize: serialize
  , deserialize: deserialize
  , unlink: unlink
  , link: link
  , Logins: Logins
  , Accounts: Accounts
  , LocalLogin: LocalLogin
  , BearerLogin: BearerLogin
  , Oauth2ClientLogin: Oauth2ClientLogin
  };

  return Auth;
};
