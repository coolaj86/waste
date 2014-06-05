'use strict';

var forEachAsync = require('foreachasync').forEachAsync
  ;

module.exports.create = function (config, Users, Accounts) {
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

  function serialize(reqSessionUser, done) {
    var currentUser
      , oldUser
      , loginIds = []
      ;

    if (reqSessionUser.newUser) {
      currentUser = reqSessionUser.newUser;
      delete reqSessionUser.newUser;

      oldUser = reqSessionUser.currentUser;
      reqSessionUser.currentUser = currentUser;
    } else {
      currentUser = reqSessionUser.currentUser;
    }

    if (oldUser) {
      loginIds = Users.scrapeIds(oldUser);
    }


    /*
    Logins.update(currentUser, function (id) {
      if (-1 === loginIds.indexOf(id)) {
        loginIds.push(id);
      }
      done(null, { loginIds: loginIds, loginId: id });
    });
    */
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
  }

  function deserialize(loginObj, done) {
    /*
    Logins.get(loginObj.loginIds, function (logins) {
      var accountIds
        , accounts
        ;

      accounts = logins.reduce(function (memo, login) {
        return memo.concat(login.accounts || []);
      }, []);

      if (!accounts.length) {
        accounts = null;
        accountIds = logins.reduce(function (memo, login) {
          return memo.concat(login.accountIds);
        }, []);
      }

      Accounts.get(accounts || accountIds, function (accounts) {
        logins.forEach(function (login) {
          if (login.id === loginObj.loginId) {
            
          }
        });

        done(null, {
          logins: logins
        , loginId: loginObj.loginId
        , accounts: accounts
        , accountId: 
        });
      });
    });
    */

    Users.findById(loginObj, function (authN) {
      getAccounts(authN, [], function (err, accounts) {
        getProfiles(accounts, function (err, authNs) {
          // Note: these profiles have access tokens and such
          var data = { currentUser: authN, accounts: accounts || 'error 64', profiles: authNs || 'error 512' }
            ;

          done(null, data);
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
