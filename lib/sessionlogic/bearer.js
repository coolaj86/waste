'use strict';

    // looks for
      // HTTP Authorization Bearer header
      // `access_token` in form field
      // `access_token` URL query param
var BearerStrategy = require('passport-http-bearer').Strategy
  ;

module.exports.create = function (passport, config, opts) {
  var bearerStrategy
    , BearerLogin = opts.Auth.BearerLogin
    ;

  // TODO associated scope with token
  function tokenLookup(token, done) {
    return BearerLogin
      .login({ uid: token })
      .then(
        function (thingy) {
          if (!thingy) {
            console.log("[bearer] invalid bearer token");
            console.log(token);
            done(null, null);
            return;
          }

          // TODO all Logins need to change to allow additional messages to be passed
          // with the return object (such as a message with 'invalid password')
          var login = thingy && thingy.login || thingy
            , info = login && login.info || login.get('scope') || { scope: '*' } // as opposed to client
            ;

          // login.uid represents both OAuth Applications and Human Users
          // so there is a flag to distinguish which type/role of account this is
          if (login.app || login.client || login.consumer) {
            info.app = true;
            info.client = true;
            info.consumer = true;
          } else {
            info.login = true;
            info.user = true;
          }

          console.log('[tokenLookup] login  ' + (login && Object.keys(login)));
          done(null, login && login.toJSON(), info);
        }
      , function (err) {
          done(err);
        }
      );
  }

  bearerStrategy = new BearerStrategy(function (token, done) {
    tokenLookup(token, function (err, user) {
      done(err, user);
    });
  });
  bearerStrategy.name = 'bearer.st';

  // and a token is a token
  passport.use(bearerStrategy);

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
          res.send({ error: {
            message: "login failed: " + err.toString()
          , code: "INVALID_AUTH_TOKEN"
          } });
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

  function route(rest) {
    rest.post(config.apiPrefix + '/session/bearer', handleLogin('bearer.st'));
  }

  route.bearerStrategy = bearerStrategy;
  return {
    route: route
  , bearerStrategy: bearerStrategy
  };
};
