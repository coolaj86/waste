'use strict';

var Passport = require('passport').Passport
  , facebook = require('./facebook')
  , twitter = require('./twitter')
  , forEachAsync = require('forEachAsync').forEachAsync
  , path = require('path')
  , Users = require('./users').create({ dbfile: path.join(__dirname, '..', 'data', 'users.priv.json') })
  , AccountLinks = require('./account-links').create({ dbfile: path.join(__dirname, '..', 'data', 'users-accounts.priv.json') })
  , Accounts = require('./accounts').create({ dbfile: path.join(__dirname, '..', 'data', 'accounts.priv.json')})
  ;

module.exports.init = function (app, config) {
  var passport = new Passport()
    , routes = []
    ;

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

      _ids = AccountLinks.scrape(authN);
      if (0 === _ids.length) {
        // TODO bad user account
        done(new Error("unrecognized account type"));
        return;
      }
      _ids.forEach(function (id) {
        loginIds.push(id);
      });

      loginIds.forEach(function (id) {
        AccountLinks.find(id).forEach(function (accountId) {
          accountIdMap[accountId] = true;
        });
      });

      Object.keys(accountIdMap).forEach(function (accountId) {
        accounts.push(Accounts.find(accountId));
      });

      if (0 === accounts.length) {
        accounts.push(Accounts.create(loginIds, {}));
      }

      loginIds.forEach(function (id) {
        accounts.forEach(function (account) {
          AccountLinks.create(id, account.uuid);
        });
      });

      done(null, accounts);
    });
  }

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.  However, since this example does not
  //   have a database of user records, the complete Facebook profile is serialized
  //   and deserialized.

  // save to db
  passport.serializeUser(function(reqSessionUser, done) {
    var currentUser
      , oldUser
      , loginIds = []
      ;

    console.log('sanity check');
    console.log(reqSessionUser);

    if (reqSessionUser.newUser) {
      currentUser = reqSessionUser.newUser;
      delete reqSessionUser.newUser;

      oldUser = reqSessionUser.currentUser;
      reqSessionUser.currentUser = currentUser;
    } else {
      currentUser = reqSessionUser.currentUser;
    }

    if (oldUser) {
      loginIds = AccountLinks.scrape(oldUser);
    }
    console.log('old / current user');
    console.log(oldUser);
    console.log(currentUser);

    Users.create(currentUser, function () {
      getAccounts(currentUser, loginIds, function (err, accounts) {
        getProfiles(accounts, function (/*err, profiles*/) {
          Users.getId(currentUser, function (err, id) {
            done(null, id);
          });
        });
      });
    });
  });

  // session restores from db
  passport.deserializeUser(function (loginId, done) {
    Users.findById(loginId, function (authN) {
      getAccounts(authN, [], function (err, accounts) {
        getProfiles(accounts, function (err, authNs) {
          // Note: these profiles have access tokens and such
          var data = { currentUser: authN, accounts: accounts, profiles: authNs }
            ;

          done(null, data);
        });
      });
    });
  });

  app
    .use(passport.initialize())
    .use(passport.session())
    ;

  routes.push(facebook.init(passport, config, { Users: Users, AccountLinks: AccountLinks }));
  routes.push(twitter.init(passport, config, { Users: Users, AccountLinks: AccountLinks }));

  return routes;
};
