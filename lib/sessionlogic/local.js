'use strict';

    // looks for a username and password field in the request
var LocalStrategy = require('passport-local').Strategy
    // looks for an HTTP Authorization Basic header
  , BasicStrategy = require('passport-http').BasicStrategy
  // TODO
  //, ManualStrategy = require('passport-http-bearer').Strategy
  ;

module.exports.create = function (passport, config, opts) {
  var passphraseStrategy
    , secretStrategy
    , secretStrategyId
    , localStrategy
    , basicStrategy
    //, manualStrategy
    , LocalLogin = opts.Auth.LocalLogin
    ;

  function basicLookup(clientId, clientSecret, done) {
    // TODO hash the clientId (username) and use that as the id
    return LocalLogin
      .login({ uid: clientId, secret: clientSecret })
      .then(
        function (login) {
          console.log('[basicLookup] login  ');
          console.log(login);
          console.log(login && Object.keys(login));
          done(null, login && login.toJSON());
        }
      , function (err) {
          done(err);
        }
      );
  }

  /*
  function manualLookup(hashid, done) {
    return opts.Auth.Logins.login({ id: hashid }).then(function (login) { done(login); }, done);
  }

  manualStrategy = new BearerStrategy(function (token, done) {
    manualLookup(token, function (err, user) {
      done(err, user);
    });
  });
  manualStrategy.name = 'manual.hashid';
  */

  // username & password are intuitive,
  // but I much prefer passphrase at worst and,
  // preferably, the more generic id and secret
  localStrategy = new LocalStrategy(basicLookup);
  localStrategy.name = 'local.st';
  passport.use(localStrategy);

  passphraseStrategy = new LocalStrategy({ passwordField: 'passphrase' }, basicLookup);
  passphraseStrategy.name = 'local.st.passphrase';
  passport.use(passphraseStrategy);

  secretStrategy = new LocalStrategy({ usernameField: 'uid', passwordField: 'secret' }, basicLookup);
  secretStrategy.name = 'local.st.secret';
  passport.use(secretStrategy);

  secretStrategyId = new LocalStrategy({ usernameField: 'id', passwordField: 'secret' }, basicLookup);
  secretStrategyId.name = 'local.st.secret.id';
  passport.use(secretStrategyId);

  // http basic doesn't have named fields
  basicStrategy = new BasicStrategy(basicLookup);
  basicStrategy.name = 'basic.st';
  passport.use(basicStrategy);

  // Yes, custom callbacks have a lot of layers...
  // http://passportjs.org/guide/authenticate/#custom-callback
  //
  // Alternate approach:
  //  rest.get('/api/session/whatevs', passport.authenticate(
  //    'local'
  //  , { failureRedirect: '/login-failed.json'
  //    , successReturnToOrRedirect: '/api/me'
  //    //, successRedirect: '/api/me'
  //    }
  //  ));
  //
  //  negs: has a redirect, can't send specific error, can't manually login
  //  pros: appropriate api redirect will show up in the console
  function handleLogin(type) {
    return function (req, res, next) {
      function handleSuccessOrFailure(err, user, info) {
        if (err) {
          res.error({
            message: "login failed: " + err.toString()
          , code: "INVALID_AUTH"
          });
          return;
        }

        console.log('[sessionlogic/local]', type);
        opts.login(req, res, next, {
          error: err
        , user: user
        , info: info
        //, successUrl: '/api/users/me'
        //, successUrl: '/api/session'
        });
      }

      passport.authenticate(type, handleSuccessOrFailure)(req, res, next);
    };
  }

  function manualLogin(id, secret, req, res, cb, wrapped) {
    wrapped = wrapped || {};
    var authorization = req.headers.authorization
      ;

    function handleResult(err, user, info) {
      req.headers.authorization = authorization;

      if (err) {
        if (wrapped.wrapped) {
          err.code = err.code || "INVALID_AUTH";
          cb(err);
          return;
        }
        // TODO cb(err) ?;
        res.error({
          message: "login failed: " + err.toString()
        , code: "INVALID_AUTH"
        });
        return;
      }

      opts.login(req, res, cb, {
        error: err
      , user: user
      , info: info
      //, successUrl: '/api/users/me'
      //, successUrl: '/api/session'
      }, wrapped);
    }

    req.headers.authorization = 'Basic ' + require('btoa')(id + ':' + secret);

    // TODO test putting res = null XXX
    // TODO test putting req = { headers: headers } XXX
    passport.authenticate('basic.st', handleResult)(req, res, cb);
    //passport.authenticate('local.secret', handleSuccessOrFailure)(req, res, next);
  }

  function route(rest) {
    rest.post(config.apiPrefix + '/session/local', handleLogin('local.st'));
    rest.post(config.apiPrefix + '/session/local', handleLogin('local.st.passphrase'));
    rest.post(config.apiPrefix + '/session/local', handleLogin('local.st.secret'));
    rest.post(config.apiPrefix + '/session/local', handleLogin('local.st.secret.id'));
    rest.post(config.apiPrefix + '/session/basic', handleLogin('basic.st'));
  }

  route.manualLogin = manualLogin;
  return {
    route: route
  , manualLogin: manualLogin
  };
};
