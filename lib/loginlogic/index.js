'use strict';

/*
var forEachAsync = require('foreachasync').forEachAsync
  ;
*/

module.exports.create = function (config, Users, Accounts) {
  /*
  function getProfiles(accounts, done) {
    var profiles = []
      , profileMap = {}
      ;

    accounts.forEach(function (account) {
      account.loginIds.forEach(function (loginId) {
        profileMap[loginId] = true;
      });
    });

    forEachAsync(Object.keys(profileMap), function (next, loginId) {
      Users.findById(loginId, function (profile) {
        if (profile) {
          profiles.push(profile);
        }
        next();
      });
    }).then(function () {
      done(null, profiles);
    });
  }

  function getAccounts(_authN, loginIds, done) {
    Users.read(_authN, function (authN) {
      var accountIdMap = {}
        , accounts = []
        , _ids
        ;

      _ids = Users.scrapeIds(authN);
      if (0 === _ids.length) {
        // TODO bad user account
        done(new Error("unrecognized account type"));
        return;
      }
      _ids.forEach(function (id) {
        loginIds.push(id);
      });

      forEachAsync(loginIds, function (next, id) {
        Users.findById(id, function (user) {
          user.accounts.forEach(function (accountId) {
            accountIdMap[accountId] = true;
          });
          next();
        });
      }).then(function () {
        Object.keys(accountIdMap).forEach(function (accountId) {
          var account = Accounts.find(accountId)
            ;

          if (!account) {
            console.error('No Account', accountId);
          } else {
            accounts.push(Accounts.find(accountId));
          }
        });

        if (0 === accounts.length) {
          accounts.push(Accounts.create(loginIds, {}));
        }

        loginIds.forEach(function (id) {
          accounts.forEach(function (account) {
            Users.link(id, account.uuid);
            Accounts.addLoginId(account.uuid, id);
          });
        });

        done(null, accounts);
      });
    });
  }
  */

  function serialize(sessionObj, done) {
    var Logins = Users
      , login
      , loginIds = []
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

      sessionObj.login = login;
      sessionObj.selectedLoginId = login.id;
    }

    function finish() {
      sessionIds.selectedLoginId = sessionObj.login.id;
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
    } else {
      finish();
    }

    /*
    Users.create(currentUser, function () {
      getAccounts(currentUser, loginIds, function (err, accounts) {
        getProfiles(accounts, function (err, profiles) {
          Users.getId(currentUser, function (err, id) {
            // This object should look just like it will once its deserialized
            reqSessionUser.accounts = reqSessionUser.accounts || accounts;
            reqSessionUser.profiles = reqSessionUser.profiles || profiles;
            done(null, id);
          });
        });
      });
    });
    */
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
            if (login.id === sessionIds.selectedLoginId) {
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
          if (l.id === sessionIds.selectedLoginId) {
            login = l;
          }
        });

        done(err || err2, {
          logins: logins
        , selectedLoginId: sessionIds.selectedLoginId
        , login: login
        , accounts: accounts
        , account: account
        , selectedAccountId: sessionIds.selectedAccountId
        });
      });
    });

    /*
    Users.mget(sessionIds.loginIds, function (logins) {
      getAccounts(authN, [], function (err, accounts) {
        getProfiles(accounts, function (err, authNs) {
          // Note: these profiles have access tokens and such
          var data = { currentUser: authN, accounts: accounts || 'error 64', profiles: authNs || 'error 512' }
            ;

          done(null, data);
        });
      });
    });
    */
  }

  return {
    serialize: serialize
  , deserialize: deserialize
  , Users: Users
  , Accounts: Accounts
  };
};
