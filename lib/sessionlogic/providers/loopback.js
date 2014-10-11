'use strict';

var LoopbackStrategy = require('./passport-loopback').Strategy
  ;

module.exports.init = function (passport, config, loginHelpers) {
  passport.use(
    'st.loopback'
  , new LoopbackStrategy({
      clientID: config.loopback.id
    , clientSecret: config.loopback.secret
    , callbackURL: config.protocol + "://" + config.host
        + config.oauthPrefix + "/loopback/callback"
    }
  , function handleLogin(accessToken, refreshToken, profile, done) {
      var user
        , info = { info: true, debug_infoInLoopbackStrategy: true }
        ;

      // this object is attached as or merged to req.session.passport.user
      delete profile._raw;
      delete profile._json;

      user = {
        profile: profile
      , accessToken: accessToken
      , refreshToken: refreshToken
      };

      done(null, user, info);
    }
  ));

  function route(rest) {
    rest.get(
      config.oauthPrefix + '/loopback/callback'
    , function (req, res, next) {
        passport.authenticate('st.loopback', function (err, user, info) {
          loginHelpers.login(req, res, next, {
            error: err
          , user: user
          , info: info
          // NOTE this does not issue a Location redirect.
          // Instead, the file is read and served with the current URL.
          // The hash/anchors are being used as reminder placeholders
          , successUrl: '/loopback-close.html' // TODO #allow
          , failureUrl: '/loopback-error.html' // TODO #error || #deny
          });
        })(req, res, next);
      }
    );

    // Redirect the user to Loopback for authentication.  When complete,
    // Loopback will redirect the user back to the application at
    //   /auth/loopback/callback
    rest.get(
      config.oauthPrefix + '/loopback/connect'
    , passport.authenticate('loopback', { scope: ['me:email::'] })
    );
  }

  return { route: route };
};
