'use strict';

module.exports.create = function (config, Users, Accounts) {

  function serialize(sessionObj, done) {
    var Logins = Users
      , login
      , loginIds = []
      , account
      , sessionIds = { accountIds: [] , loginIds: [] }
      ;

    if (sessionObj.newLogin) {
      login = sessionObj.newLogin;
      delete sessionObj.newLogin;

      if (!sessionObj.logins.some(function (l) {
        if (l.id === login.id) {
          return true;
        }
      })) {
        sessionObj.logins.push(login);
      }

      if (sessionObj.selectedAccountId) {
        account = Accounts.select(sessionObj.selectedAccountId, sessionObj.accounts);
        sessionObj.account = account;

        if (!account) {
          // this should never happen
          console.error('ERROR: got a selectedAccountId with no related account');
          console.error(sessionObj);
          return;
        }

        Accounts.attachLogin(account, login);
      }

      sessionObj.login = login;
      sessionObj.mostRecentLoginId = login.id;
    }

    function finish() {
      sessionIds.mostRecentLoginId = sessionObj.login.id;
      sessionIds.loginIds = sessionObj.logins.reduce(function (ids, l) {
        ids.push(l.id);
        return ids;
      }, []);
      if (-1 === sessionIds.loginIds.indexOf(login.id)) {
        loginIds.push((login || sessionObj.login).id);
      }

      sessionIds.selectedAccountId = sessionObj.account && sessionObj.account.id;
      sessionIds.accountIds = sessionObj.accounts.reduce(function (ids, account) {
        ids.push(account.id);
        return ids;
      }, []);

      done(null, sessionIds);
    }

    if (login) {
      Logins.upsert(login, finish);
      //Accounts.upsert();
    } else {
      finish();
    }
  }

  function deserialize(sessionIds, done) {
    var Logins = Users
      ;

    // XXX mget will call create for unrecognized ids
    console.log('sessionIds');
    console.log(sessionIds);
    Logins.mget(sessionIds.loginIds, function (err, logins) {
      var accountIds
        , accounts
        ;

      accounts = logins.reduce(function (memo, login) {
        return memo.concat(login.accounts || []);
      }, []);

      if (!accounts.length) {
        accounts = null;
        accountIds = logins.reduce(function (memo, login) {
          if (login.accountIds) {
            return memo.concat(login.accountIds);
          } else {
            // TODO why is the accountIds array sometimes empty?
            return memo;
          }
        }, []);
      }

      Accounts.mget(accounts || accountIds, function (err2, accounts) {
        var account = null
          , login = null
          ;

        if (!sessionIds.accountId) {
          logins.some(function (login) {
            if (login.id === sessionIds.mostRecentLoginId) {
              sessionIds.accountId = login.primaryAccountId;
              return true;
            }
          });
        }

        accounts.forEach(function (a) {
          if (a.uuid === sessionIds.selectedAccountId) {
            account = a;
          }
        });

        logins.forEach(function (l) {
          if (l.id === sessionIds.mostRecentLoginId) {
            login = l;
          }
        });

        done(err || err2, {
          logins: logins
        , mostRecentLoginId: sessionIds.mostRecentLoginId
        , login: login
        , accounts: accounts
        , account: account
        , selectedAccountId: sessionIds.selectedAccountId
        });
      });
    });
  }

  return {
    serialize: serialize
  , deserialize: deserialize
  , Users: Users
  , Accounts: Accounts
  };
};
