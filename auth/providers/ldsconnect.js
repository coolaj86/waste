'use strict';

var LdsConnectStrategy = require('passport-lds-connect').Strategy
  ;

function getId(profile, cb) {
  if (!profile.id) {
    console.error(profile);
    throw new Error("user has no uinque identifier for which to save!");
  }

  cb(null, profile.id);
}

function getIds(profile) {
  var ids = []
    ;

  ids.push({ type: 'ldsconnect', value: profile.id });
  // TODO verify email on lds.org
  return ids;
}

module.exports.init = function (passport, config, opts) {
  opts.Users.register('ldsconnect', '1.0.0', getId, getIds);

  passport.use(new LdsConnectStrategy({
      clientID: config.ldsconnect.id,
      clientSecret: config.ldsconnect.secret,
      callbackURL: config.protocol + "://" + config.host + "/api/auth/ldsconnect/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      // this object is attached as or merged to req.session.passport.user
      delete profile._raw;
      delete profile._json;

      done(null, {
        type: 'ldsconnect'
      , fkey: profile.id
      , profile: profile
      , accessToken: accessToken
      //, refreshToken: refreshToken
      });
    }
  ));

  function route(rest) {
    rest.get(
      '/api/auth/ldsconnect/callback'
    , function (req, res, next) {
        passport.authenticate('ldsconnect', function (err, user, info) {
          opts.login(req, res, next, {
            error: err
          , user: user
          , info: info
          // NOTE this does not issue a Location redirect.
          // Instead, the file is read and surved with the current URL.
          // The hash/anchors are being used as reminder placeholders
          , successUrl: '/lds-close.html' // TODO #allow
          , failureUrl: '/lds-error.html' // TODO #error || #deny
          });
        })(req, res, next);
      }
    );

    // Redirect the user to LdsConnect for authentication.  When complete,
    // LdsConnect will redirect the user back to the application at
    //   /auth/ldsconnect/callback
    rest.get('/auth/ldsconnect', passport.authenticate('ldsconnect', { scope: ['email'] }));
  }

  return route;
};
