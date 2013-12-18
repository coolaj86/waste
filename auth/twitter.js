'use strict';

var TwitterStrategy = require('passport-twitter').Strategy
  , OAuth = require('oauth').OAuth
  ;

module.exports.init = function (passport, config) {
  var oa
    , users
    , twitterAuthn
    , twitterAuthz
    , twConfig = config.twitter
    ;

  function directMessage(user, params, cb) {
    oa.post(
      "https://api.twitter.com/1.1/direct_messages/new.json"
    , user.twitter.token
    , user.twitter.tokenSecret
    , { "screen_name": params.sn, text: params.text }
    , cb
    );
  }

  // TODO to allow this user to message you, follow us
  users = _users;

  twitterAuthn = new TwitterStrategy({
      consumerKey: twConfig.consumerKey
    , consumerSecret: twConfig.consumerSecret
    , callbackURL: "http://" + config.host + "/authn/twitter/callback"
    },
    function(token, tokenSecret, profile, done) {
      console.log('[load:twN]');

      delete profile._raw;
      delete profile._json;
      done(null, user);
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
      var user = users.find(profile.username + ':twitter')
        ;

      // the future
      delete profile._raw;
      user.twitter = user.twitter || {};
      user.twitter.token = token;
      user.twitter.tokenSecret = tokenSecret;
      user.twitter.profile = profile;
      // TODO a user may revoke this later so we'll have to adjust in that case
      user.twitter.authorized = true;

      user = users.set(profile.username + ':twitter', user);
      done(null, user);
    }
  );
  twitterAuthz.name = 'twitterAuthz';

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

  passport.use(twitterAuthn);
  passport.use(twitterAuthz);

  initTwitterOauth();

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
    , passport.authenticate('twitterAuthn', { failureRedirect: '/login' })
    , function (req, res) {
        // If we don't have authorization, get it
        if (!req.user.twitter.authorized) {
          res.redirect('/authz/twitter');
          return;
        }
        // If we do, get this window to close on itself
        // TODO remove redirect by using req.url = 'close.html' and another static middleware
        res.redirect('/close.html');
      }
    );

    // Twitter AuthZ
    // Handle the case that the user wants to use a direct message, but hasn't authorized yet
    rest.get(
      '/authz/twitter'
    , passport.authenticate('twitterAuthz')
    );
    rest.get(
      '/authz/twitter/callback'
    , passport.authenticate('twitterAuthz', { failureRedirect: '/login' })
    , function(req, res) {
        // Successful authentication, redirect home.
        //res.redirect(req.session.whatWasWanted || '/');
        res.redirect('/auth-callback.html');
      }
    );
  }

  //module.exports.init = init;
  //module.exports.directMessage = directMessage;

  return route;
};
