'use strict';

var Passport = require('passport').Passport
  , facebook = require('./facebook')
  , ldsconnect = require('./ldsconnect')
  , twitter = require('./twitter')
  , tumblr = require('./tumblr')
  , local = require('./local')
  , forEachAsync = require('foreachasync').forEachAsync
  , path = require('path')
  , Users = require('./users').create({ dbfile: path.join(__dirname, '..', 'priv', 'users.priv.json') })
  , Accounts = require('./accounts').create({ dbfile: path.join(__dirname, '..', 'priv', 'accounts.priv.json')})
  , strategies = {}
  ;

module.exports.strategies = strategies = {
  twitter: twitter
, tumblr: tumblr
};
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

  /*
  function handleFailure(req, res, opts) {
    if (opts.failure) {
    } else if (opts.failureMessage) {
    } else if (opts.failureUrl) {
    } else {
      res.send({ error: { message: "failed at " + opts.error.toString() } });
    }
  }
  */
  // The reason this function has been pulled out to
  // auth/index.js is because it is very common among
  // the various auth implementations and it does some
  // currentUser mangling, which may change in the future
  // and the underlying implementations should not need to be aware of it
  function handleLogin(req, res, next, opts) {
    var currentUser
      ;

    if (opts.error || !opts.user) {
      if (opts.failure) {
        opts.failure();
        return;
      }
      req.url = opts.failureUrl;
      next();
      return;
    }

    // this is conditional, there may not be a req.user
    currentUser = req.user && req.user.currentUser;

    // the object passed here becomes req.user
    // newUser will become currentUser if it exists
    // currentUser will become oldUser or stay as currentUser
    // TODO currentAccount
    req.logIn({ newUser: opts.user, currentUser: currentUser }, function (err) {
      if (err) { return next(err); }

      function finish() {
        req.url = opts.successUrl;
        next();
      }

      if (opts.callback) {
        // TODO is req.user.currentUser === user?
        opts.callback(req.user.currentUser, finish);
      } else {
        finish();
      }
    });
  }

  routes.push(facebook.init(passport, config, { Users: Users, login: handleLogin }));
  routes.push(twitter.init(passport, config, { Users: Users, login: handleLogin }));
  routes.push(tumblr.init(passport, config, { Users: Users, login: handleLogin }));
  routes.push(ldsconnect.init(passport, config, { Users: Users, login: handleLogin }));
  routes.push(local.init(passport, config, { Users: Users, login: handleLogin }));

  routes.routes = routes;
  routes.strategies = strategies;
  return routes;
};
