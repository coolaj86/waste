'use strict';

var FacebookStrategy = require('passport-facebook').Strategy
  ;

module.exports.init = function (passport, config) {
  passport.use(new FacebookStrategy({
      clientID: config.facebook.id,
      clientSecret: config.facebook.secret,
      callbackURL: config.protocol + "://" + config.host + "/api/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      console.log(accessToken, refreshToken, profile);

      // this object is attached as or merged to req.session.passport.user
      delete profile._raw;
      delete profile._json;
      done(null, {
        type: 'facebook'
      , profile: profile
      , accessToken: accessToken
      , refreshToken: refreshToken
      });
      /*
      User.findOrCreate(..., function(err, user) {
        if (err) { return done(err); }
        done(null, user);
      });
      */
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
          console.log('*******************************');
          console.log('route data');
          console.log(data);
          // the object passed here becomes req.user
          req.logIn(data, function (err) {
            if (err) { return next(err); }
            //return res.redirect('/users/' + user.username);

            console.log('req.session');
            console.log(req.session);
             /* ?type=fb'
              + '&accessToken=' + req.session.passport.user.accessToken
              + '&email=' + req.session.passport.user.profile.email
              + '&link=' + req.session.passport.user.profile.profileUrl
              */

            console.log(url);
            //res.statusCode = 302;
            //res.setHeader('Location', '');
            //res.end('hello');
            // This will pass through to the static module
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
