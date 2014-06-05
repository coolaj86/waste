'use strict';

var Passport = require('passport').Passport
  , local = require('./local')
  , facebook = require('./providers/facebook')
  , ldsconnect = require('./providers/ldsconnect')
  , twitter = require('./providers/twitter')
  , tumblr = require('./providers/tumblr')
  , forEachAsync = require('foreachasync').forEachAsync
  , path = require('path')
  , strategies = {}
  ;

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
    req.url = opts.failureUrl || req.url;
    next();
    //res.redirect(opts.failureUrl);
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
      req.url = opts.successUrl || req.url;
      next();
      //res.redirect(opts.successUrl);
    }

    if (opts.callback) {
      // TODO is req.user.currentUser === user?
      opts.callback(req.user.currentUser, finish);
    } else {
      finish();
    }
  });
}

module.exports.strategies = strategies = {
  twitter: twitter
, tumblr: tumblr
, facebook: facebook
, ldsconnect: ldsconnect
, local: local
};

module.exports.init = function (app, config, Users, Accounts) {
  var passport = new Passport()
    , routes = []
    , localRoute
    , opts = { Users: Users, login: handleLogin }
      // TODO test that publicApi actually falls under apiPrefix
    , publicApiRe = new RegExp('^' + config.publicApi
        .replace(new RegExp('^' + config.apiPrefix), ''))
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

  localRoute = local.init(passport, config, opts);

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
  });

  // session restores from db
  passport.deserializeUser(function (loginId, done) {
    Users.findById(loginId, function (authN) {
      getAccounts(authN, [], function (err, accounts) {
        getProfiles(accounts, function (err, authNs) {
          // Note: these profiles have access tokens and such
          var data = { currentUser: authN, accounts: accounts || 'error 64', profiles: authNs || 'error 512' }
            ;

          done(null, data);
        });
      });
    });
  });

  //routes.push(rootUser.init(passport, config, opts));
  // This Provider
  // On init this provides the 'bearer' strategy
  // passport.use(localRoute.bearerStrategy);
  routes.push(localRoute);

  // 3rd Party Providers
  routes.push(facebook.init(passport, config, opts));
  routes.push(twitter.init(passport, config, opts));
  routes.push(tumblr.init(passport, config, opts));
  routes.push(ldsconnect.init(passport, config, opts));
  
  app
    .use(passport.initialize())
    .use(passport.session())
    // when using access_token / bearer without a session
    .use(config.apiPrefix, function (req, res, next) {
        if (req.user || publicApiRe.test(req.url)) {
          next();
          return;
        }

        // everything except for bearer relies on a session
        //passport.authenticate('bearer', { session: false }),
        passport.authenticate('bearer', function (err, user, info) {
          function continueLogin() {
            // This creates a session via req.logIn(),
            // which is not strictly required
            opts.login(req, res, next, {
              error: err
            , user: user
            , info: info
            });
          }

          function doesntNeedAuth() {
            return (
                req.skipAuthn
              || publicApiRe.test(req.url)
                // TODO ues session prefix
              || !/^\/session($|\/)/.test(req.url)
            );
          }

          if (!err && (user || doesntNeedAuth())) {
            continueLogin();
            return;
          }

          res.send({ error: {
            message: "Unauthorized access to " + config.apiPrefix
          , code: 401
          , class: "INVALID-BEARER-TOKEN"
          , superclasses: []
          } });
        })(req, res, next);
      })
    ;

  routes.routes = routes;
  routes.strategies = strategies;
  return routes;
};
