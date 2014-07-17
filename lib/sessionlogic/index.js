'use strict';

var Passport = require('passport').Passport
  , local = require('./local')
  , facebook = require('./providers/facebook')
  , ldsconnect = require('./providers/ldsconnect')
  , twitter = require('./providers/twitter')
  , tumblr = require('./providers/tumblr')
  , strategies = {}
  ;

// The reason this function has been pulled out to
// auth/index.js is because it is very common among
// the various auth implementations and it does some
// req.user mangling, which has already changed once,
// and the underlying implementations should not need to be aware of it
function handleLogin(req, res, next, opts) {
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

  opts.user.uid = opts.user.profile.id;
  opts.user.typedUid = opts.user.type + ':' + opts.user.profile.id;
  opts.user.id = opts.user.typedUid;

  /*
  // TODO might it be simpler and more appropriate to fetch accounts here here?
  // (currently this is done in lib/loginlogic/index.js
  if (-1 === loginIds.indexOf(opts.user.id)) {
    loginIds.push(opts.user.id);
  }

  loginIds.forEach(function (login) {
    login.accountIds.forEach(function (accountId) {
      if (-1 === accountIds.indexOf(accountId)) {
        accountIds.push(accountId);
      }
    });
  });
  */

  // this session object will overwrite the existing req.user
  session = {
  //  mostRecentLoginId: opts.user.id || requser.mostRecentLoginId || null
    mostRecentLoginId: requser.mostRecentLoginId || null
  , selectedAccountId: requser.selectedAccountId || null
  //, logins: loginIds
  //, accounts: accountIds
  , logins: requser.logins || []
  , accounts: requser.accounts || []
  , newLogin: opts.user
  };
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

module.exports.strategies = strategies = {
  twitter: twitter
, tumblr: tumblr
, facebook: facebook
, ldsconnect: ldsconnect
, local: local
};

module.exports.init = function (app, config, Auth) {
  var passport = new Passport()
    , routes = []
    , localRoute
    , opts = { Auth: Auth, login: handleLogin }
      // TODO test that publicApi actually falls under apiPrefix
    , publicApiRe = new RegExp('^' + config.publicApi
        .replace(new RegExp('^' + config.apiPrefix), ''))
    ;

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
               // TODO ues session prefix
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

  routes.manualLogin = localRoute.manualLogin;
  routes.routes = routes;
  routes.strategies = strategies;
  return routes;
};
