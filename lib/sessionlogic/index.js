'use strict';

var Passport = require('passport').Passport
    // TODO make these create-able and return instances
  , local = require('./local')
  , facebook = require('./providers/facebook')
  , ldsconnect = require('./providers/ldsconnect')
  , twitter = require('./providers/twitter')
  , tumblr = require('./providers/tumblr')
  , strategies = {}
  ;

exports.strategies = strategies = {
  twitter: twitter
, tumblr: tumblr
, facebook: facebook
, ldsconnect: ldsconnect
, local: local
};

// this isn't a true create yet because the proviers aren't true creates
module.exports.init = function (app, config, Auth) {
  // The reason this function has been pulled out to
  // auth-logic/index.js is because it is very common among
  // the various auth implementations and it does some
  // req.user mangling, which has already changed once,
  // and the underlying implementations should not need to be aware of it
  function handleLogin(req, res, next, opts) {
    // TODO this function might be the right one to wrap
    // on a per-module basis to enforce 'type' is what it ought to be
    var session
      , requser = req.user || {}
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

    if (!opts.user.uid) {
      console.error('[ERROR]');
      console.error(opts.user);
      throw new Error('user.uid should have been set in passport middleware');
    }

    // this session object will overwrite the existing req.user
    session = {
    //  mostRecentLoginId: opts.user.id || requser.mostRecentLoginId || null
      mostRecentLoginId: requser.mostRecentLoginId || null
    , selectedAccountId: requser.selectedAccountId || null
    , logins: requser.logins || []
    , accounts: requser.accounts || []
      // this may be JSON or a bookshelf obj
      // TODO BearersLogin and LocalsLogin should return JSON objects for consistency?
    , newLogin: opts.user
    };

    // this call is what overwrites req.user with session
    req.logIn(session, function (err) {
      if (err) {
        return next(err);
      }
      

      function finish() {
        // TODO save req.user.login
        req.url = opts.successUrl || req.url;
        // connect treats first argument as error, but sometimes 'next' isn't in connect
        next(null, req.user);
        //res.redirect(opts.successUrl);
      }

      if (opts.callback) {
        // TODO is req.user.login === opts.user?
        // twitter needs this callback to determine
        // if this user has been authenticated AND authorized
        opts.callback(req.user.login, finish);
      } else {
        finish();
      }
    });
  }

  var passport = new Passport()
    , results = {}
    , routes = []
    , localRoute
    , opts = { Auth: Auth, login: handleLogin }
      // TODO test that publicApi actually falls under apiPrefix
    , publicApiRe = new RegExp('^' + config.publicApi
        .replace(new RegExp('^' + config.apiPrefix), ''))
    ;

  localRoute = local.create(passport, config, opts);

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.  However, since this example does not
  //   have a database of user records, the complete Facebook profile is serialized
  //   and deserialized.

  // save to db
  passport.serializeUser(function(reqSessionUser, done) {
    Auth.serialize(reqSessionUser, function (err, authObj) {
      done(err, authObj);
    });
  });

  // session restores from db
  passport.deserializeUser(function (loginObj, done) {
    Auth.deserialize(loginObj, function (err, authObj) {
      done(null, authObj);
    });
  });

  //routes.push(rootUser.init(passport, config, opts));
  // This Provider
  // On init this provides the 'bearer.st' strategy
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
    .use(function (req, res, next) {
        // when using access_token / bearer without a session
        // also, we will pefer a token over a session (and thus switch users)
        if (!/^bearer/i.test(req.headers.authorization)) {
          next();
          return;
        }

        // everything except for bearer relies on a session
        //passport.authenticate('bearer.st', { session: false }),
        passport.authenticate('bearer.st', function (err, user, info) {
          if (err && !user) {
            res.send({ error: {
              message: "Invalid api access token"
            , code: 401
            , class: "INVALID-BEARER-TOKEN"
            , superclasses: []
            } });
            return;
          }

          // This creates a session via req.logIn(),
          // which is not strictly required
          opts.login(req, res, next, {
            error: err
          , user: user
          , info: info
          });
        })(req, res, next);
      })
    .use(config.apiPrefix, function (req, res, next) {
        function doesntNeedAuth() {
          return (
              req.skipAuthn
            || publicApiRe.test(req.url)
               // TODO use session prefix
            || /^\/(session|accounts|logins)($|\/)/.test(req.url)
          );
        }

        if (req.user || doesntNeedAuth()) {
          next();
          return;
        }

        res.send({ error: {
          message: "Unauthorized access to " + config.apiPrefix
        , code: 401
        , class: "INVALID-BEARER-TOKEN"
        , superclasses: []
        } });
      })
    ;

  results.manualLogin = localRoute.manualLogin;
  results.routes = routes;
  results.strategies = strategies;

  return results;
};
