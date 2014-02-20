'use strict';

var LdsAuthStrategy = require('passport-ldsauth').Strategy
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

  ids.push({ type: 'ldsauth', value: profile.id });
  // TODO verify email on lds.org
  return ids;
}

module.exports.init = function (passport, config, opts) {
  opts.Users.register('ldsauth', '1.0.0', getId, getIds);

  passport.use(new LdsAuthStrategy({
      clientID: config.ldsauth.id,
      clientSecret: config.ldsauth.secret,
      callbackURL: config.protocol + "://" + config.host + "/api/auth/ldsauth/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      // this object is attached as or merged to req.session.passport.user
      delete profile._raw;
      delete profile._json;

      done(null, {
        type: 'ldsauth'
      , fkey: profile.id
      , profile: profile
      , accessToken: accessToken
      //, refreshToken: refreshToken
      });
    }
  ));

  function route(rest) {
    rest.get(
      '/api/auth/ldsauth/callback'
      //passport.authenticate('ldsauth', { successRedirect: '/close.html?accessToken=blar',
      //                                    failureRedirect: '/close.html?error=foo' }));
    , function (req, res, next) {
        passport.authenticate('ldsauth', function (err, data) {
          var url = '/lds-close.html'
            , currentUser
            ;

          if (err || !data) {
            url = '/lds-error.html';
            req.url = url;
            next();
            return;
          }

          // this is conditional, there may not be a req.user
          currentUser = req.user && req.user.currentUser;

          // the object passed here becomes req.user
          req.logIn({ newUser: data, currentUser: currentUser }, function (err) {
            if (err) { return next(err); }

            req.url = url;
            next();
          });
        })(req, res, next);
      }
    );
    // Redirect the user to LdsAuth for authentication.  When complete,
    // LdsAuth will redirect the user back to the application at
    //   /auth/ldsauth/callback
    rest.get('/auth/ldsauth', passport.authenticate('ldsauth', { scope: ['email'] }));
  }

  return route;
};
