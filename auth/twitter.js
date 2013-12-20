'use strict';

var TwitterStrategy = require('passport-twitter').Strategy
  , OAuth = require('oauth').OAuth
  ;

function getId(profile, cb) {
  if (!profile.id) {
    console.log(profile);
    throw new Error("user has no uinque identifier for which to save!");
  }

  cb(null, profile.id);
}

function getIds(profile) {
  var ids = []
    ;

  ids.push({ type: 'twitter', value: profile.id });

  return ids;
}

module.exports.init = function (passport, config, opts) {
  opts.Users.register('twitter', '1.0.0', getId);
  opts.AccountLinks.register('twitter', '1.0.0', getIds);

  var oa
    , twitterAuthn
    , twitterAuthz
    , twConfig = config.twitter
    ;

  /*
  // TODO to allow this user to message you, follow us
  function directMessage(user, params, cb) {
    oa.post(
      "https://api.twitter.com/1.1/direct_messages/new.json"
    , user.twitter.token
    , user.twitter.tokenSecret
    , { "screen_name": params.sn, text: params.text }
    , cb
    );
  }
  */

  function initTwitterOauth() {
    oa = new OAuth(
      "https://twitter.com/oauth/request_token"
    , "https://twitter.com/oauth/access_token"
    , twConfig.consumerKey
    , twConfig.consumerSecret
    , "1.0A"
    , "http://" + config.host + "/authz/twitter/callback"
    , "HMAC-SHA1"
    );
  }
  initTwitterOauth();
  //module.exports.directMessage = directMessage;


  twitterAuthn = new TwitterStrategy({
      consumerKey: twConfig.consumerKey
    , consumerSecret: twConfig.consumerSecret
    , callbackURL: "http://" + config.host + "/authn/twitter/callback"
    },
    function(token, tokenSecret, profile, done) {
      console.log('[load:twN]');

      delete profile._raw;
      delete profile._json;
      console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
      console.log(profile);
      done(null, {
        type: 'twitter'
      , fkey: profile.id
      , profile: profile
      , token: token
      , tokenSecret: tokenSecret
      });
    }
  );
  twitterAuthn.name = 'twitterAuthn';

  twitterAuthz = new TwitterStrategy({
      consumerKey: twConfig.consumerKey
    , consumerSecret: twConfig.consumerSecret
    , callbackURL: "http://" + config.host + "/authz/twitter/callback"
    , userAuthorizationURL: 'https://api.twitter.com/oauth/authorize'
    },
    function(token, tokenSecret, profile, done) {
      console.log('[load:twZ]');

      delete profile._raw;
      delete profile._json;
      done(null, {
        type: 'twitter'
      , profile: profile
      // TODO a user may revoke authorization in the future without notification
      , authorized: true
      , token: token
      , tokenSecret: tokenSecret
      });
    }
  );
  twitterAuthz.name = 'twitterAuthz';

  passport.use(twitterAuthn);
  passport.use(twitterAuthz);


  function route(rest) {
    // Twitter AuthN
    // Handle the case that the user clicks "Sign In with Twitter" on our own app
    rest.get(
      '/authn/twitter'
    , passport.authenticate('twitterAuthn')
    );
    // Handle the oauth callback from twitter
    rest.get(
      '/authn/twitter/callback'
    , function (req, res, next) {
        passport.authenticate('twitterAuthn', function (err, data) {
          var url = '/tw-close.html'
            , currentUser
            ;

          if (err || !data) {
            url = '/tw-error.html';
            req.url = url;
            next();
            return;
          }

          console.log('[TW] *******************************');
          console.log('route data');
          console.log(data);

          console.log('[TW] *******************************');
          console.log('route user');
          console.log(req.user); // want to reuse the accounts

          // this is conditional, there may not be a req.user
          currentUser = req.user && req.currentUser;

          // the object passed here becomes req.user
          // TODO currentAccount
          req.logIn({ newUser: data, currentUser: currentUser }, function (err) {
            if (err) { return next(err); }

            console.log('req.session after login');
            console.log(req.session);

            console.log(url);

            req.url = url;
            next();
          });
        })(req, res, next);
      }
    );

    // Twitter AuthZ
    // Handle the case that the user wants to use a direct message, but hasn't authorized yet
    rest.get(
      '/authz/twitter'
    , passport.authenticate('twitterAuthz')
    , function (req, res, next) {
        passport.authenticate('twitterAuthz', function (err, data) {
          var url = '/tw-close.html'
            ;

          if (err || !data) {
            url = '/tw-error.html';
            req.url = url;
            next();
            return;
          }

          console.log('[TW] *******************************');
          console.log('route data');
          console.log(data);

          // the object passed here becomes req.user
          req.logIn(data, function (err) {
            if (err) { return next(err); }

            console.log('req.session after login');
            console.log(req.session);

            console.log(url);

            // If we don't have authorization, get it
            if (!req.user.twitter.authorized) {
              res.redirect('/authz/twitter');
              return;
            }

            req.url = url;
            next();
          });
        })(req, res, next);
      }
    );

    rest.get(
      '/authz/twitter/callback'
    , passport.authenticate('twitterAuthz', { failureRedirect: '/login' })
    , function(req, res) {
        // Successful authentication, redirect home.
        //res.redirect(req.session.whatWasWanted || '/');
        res.redirect('/tw-close.html');
      }
    );
  }

  return route;
};
