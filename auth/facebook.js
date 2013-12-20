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
      callbackURL: config.protocol + "://" + config.host + "/api/auth/facebook/callback"
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
      '/api/auth/facebook/callback'
      //passport.authenticate('facebook', { successRedirect: '/close.html?accessToken=blar',
      //                                    failureRedirect: '/close.html?error=foo' }));
    , function (req, res, next) {
        passport.authenticate('facebook', function(err, data) {
          var url = '/fb-close.html'
            , currentUser
            ;

          if (err || !data) {
            url = '/fb-error.html';
            req.url = url;
            next();
            return;
          }

          // for some reason the very first time the profile comes back it is without emails
          if (!Array.isArray(data.profile.emails)) {
            res.redirect('/auth/facebook');
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
    // Redirect the user to Facebook for authentication.  When complete,
    // Facebook will redirect the user back to the application at
    //   /auth/facebook/callback
    rest.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
  }

  return route;
};
