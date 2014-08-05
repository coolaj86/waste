'use strict';

var LoopbackStrategy = require('./passport-loopback').Strategy
  ;

module.exports.init = function (passport, config, opts) {
  passport.use(new LoopbackStrategy({
      clientID: config.loopback.id,
      clientSecret: config.loopback.secret,
      callbackURL: config.protocol + "://" + config.host
        + config.oauthPrefix + "/loopback/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      // this object is attached as or merged to req.session.passport.user
      delete profile._raw;
      delete profile._json;

      console.log('[loopback] oauth [post parse]');
      console.log(profile);
      //profile.provider = 'bearer'; // have to fudge this one since it's checking the same thing that it creates
      done(null, {
        type: profile.provider
        // in this self-same system the token is the login
        // (which retrieves the account, which is the true asset)
      , uid: accessToken
      , public: profile
      , accessToken: accessToken
      , refreshToken: refreshToken
      });
    }
  ));

  function route(rest) {
    rest.get(
      config.oauthPrefix + '/loopback/callback'
    , function (req, res, next) {
        passport.authenticate('loopback', function (err, user, info) {
          opts.login(req, res, next, {
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

  return route;
};
