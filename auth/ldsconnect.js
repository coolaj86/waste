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
      //passport.authenticate('ldsconnect', { successRedirect: '/close.html?accessToken=blar',
      //                                    failureRedirect: '/close.html?error=foo' }));
    , function (req, res, next) {
        passport.authenticate('ldsconnect', function (err, data) {
          var url = '/lds-close.html#allow'
            , currentUser
            ;

          // NOTE this does not issue a Location redirect.
          // Instead, the file is read and surved with the current URL.
          // The hash/anchors are being used as reminder placeholders
          if (err || !data) {
            console.log(err || 'no data');
            // the url
            if (err) {
              url = '/lds-close.html#error';
            }
            if (!data) {
              url = '/lds-close.html#deny';
            }
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

    // Redirect the user to LdsConnect for authentication.  When complete,
    // LdsConnect will redirect the user back to the application at
    //   /auth/ldsconnect/callback
    rest.get('/auth/ldsconnect', passport.authenticate('ldsconnect', { scope: ['email'] }));
  }

  return route;
};
