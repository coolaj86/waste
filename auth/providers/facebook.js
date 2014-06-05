'use strict';

var FacebookStrategy = require('passport-facebook').Strategy
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

  ids.push({ type: 'facebook', value: profile.id });
  profile.emails.forEach(function (emailObj) {
    // TODO should confirm e-mail address before allowing access, as facebook sometimes makes mistakes
    // see http://stackoverflow.com/questions/14280535/is-it-possible-to-check-if-an-email-is-confirmed-on-facebook
    ids.push({ type: 'email', value: emailObj.value });
  });

  return ids;
}

module.exports.init = function (passport, config, opts) {
  opts.Users.register('facebook', '1.0.0', getId, getIds);

  passport.use(new FacebookStrategy({
      clientID: config.facebook.id,
      clientSecret: config.facebook.secret,
      callbackURL: config.protocol + "://" + config.host
        + config.oauthPrefix + "/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      // this object is attached as or merged to req.session.passport.user
      delete profile._raw;
      delete profile._json;

      done(null, {
        type: 'facebook'
      , fkey: profile.id
      , profile: profile
      , accessToken: accessToken
      //, refreshToken: refreshToken
      });
    }
  ));

  function route(rest) {
    rest.get(
      config.oauthPrefix + '/facebook/callback'
    , function (req, res, next) {
        passport.authenticate('facebook', function (err, user, info) {
          console.log('[auth] [facebook]');

          // for some reason the very first time the profile comes back it is without emails
          // NOTE: if the email is unverified the array will exist, but be empty
          if (user && !Array.isArray(user.profile.emails)) {
            res.redirect(config.oauthPrefix + '/facebook/connect');
            return;
          }

          opts.login(req, res, next, {
            error: err
          , user: user
          , info: info
          , successUrl: '/facebook-close.html'
          , failureUrl: '/facebook-error.html'
          });
        })(req, res, next);
      }
    );
    // Redirect the user to Facebook for authentication.  When complete,
    // Facebook will redirect the user back to the application at
    //   /facebook/callback
    rest.get(config.oauthPrefix + '/facebook/connect', passport.authenticate('facebook', { scope: ['email'] }));
  }

  return route;
};
