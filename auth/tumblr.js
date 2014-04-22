'use strict';

var TumblrStrategy = require('passport-tumblr').Strategy
  , OAuth = require('oauth').OAuth
  , request = require('request')
  ;

function getId(profile, cb) {
  if (!profile.username) {
    console.error(profile);
    throw new Error("user has no uinque identifier for which to save!");
  }

  cb(null, profile.username);
}

function getIds(profile) {
  var ids = []
    ;

  ids.push({ type: 'tumblr', value: profile.username });

  return ids;
}

module.exports.init = function (passport, config, opts) {
  opts.Users.register('tumblr', '1.0.0', getId, getIds);

  var oa
    , tumblrAuth
    , tumblrConfig = config.tumblr
    ;

  /*
  // TODO to allow this user to message you, follow us
  function directMessage(user, params, cb) {
    oa.post(
      "https://api.tumblr.com/1.1/direct_messages/new.json"
    , user.tumblr.token
    , user.tumblr.tokenSecret
    , { "screen_name": params.sn, text: params.text }
    , cb
    );
  }
  */

  function getBlog(user, params, cb) {
    console.log(user, params, cb);
    var url = "http://api.tumblr.com/v2/blog/" + params.blog + "/posts"
      + "?notes_info=true"
      + "&offset=" + (params.offset || 0)
      + "&api_key=" + require('../config').tumblr.consumerKey
      ;

    console.log(url);
    request.get(url, function (err, req, data) {
      cb(err, data);
    });
    /*
    oa.get(
      "http://api.tumblr.com/v2/blog/" + params.blog + "/posts/text?notes_info=true"
    , user.tumblr.token
    , user.tumblr.tokenSecret
    //, { "notes_info": true }
    , cb
    );
    */
  }
  module.exports.getBlog = getBlog;

  function initTumblrOauth() {
    oa = new OAuth(
      "http://www.tumblr.com/oauth/request_token"
    , "http://www.tumblr.com/oauth/access_token"
    , tumblrConfig.consumerKey
    , tumblrConfig.consumerSecret
    , "1.0A"
    , "http://" + config.host + "/authz/tumblr/callback"
    , "HMAC-SHA1"
    );
    module.exports.oa = oa;
  }
  initTumblrOauth();
  //module.exports.directMessage = directMessage;


  tumblrAuth = new TumblrStrategy({
      consumerKey: tumblrConfig.consumerKey
    , consumerSecret: tumblrConfig.consumerSecret
    , callbackURL: "http://" + config.host + "/auth/tumblr/callback"
    },
    function(token, tokenSecret, profile, done) {
      console.log('[load:tumblrN]');

      delete profile._raw;
      delete profile._json;
      done(null, {
        type: 'tumblr'
      , fkey: profile.username
      , profile: profile
      , token: token
      , tokenSecret: tokenSecret
      });
    }
  );

  passport.use(tumblrAuth);

  function route(rest) {
    // Tumblr AuthN
    // Handle the case that the user clicks "Sign In with Tumblr" on our own app
    rest.get(
      '/auth/tumblr'
    , passport.authenticate('tumblr')
    );
    // Handle the oauth callback from tumblr
    rest.get(
      '/auth/tumblr/callback'
    , function (req, res, next) {
        passport.authenticate('tumblr', function (err, data) {
          var url = '/tumblr-close.html'
            , currentUser
            ;

          if (err || !data) {
            url = '/tumblr-error.html';
            req.url = url;
            next();
            return;
          }

          // this is conditional, there may not be a req.user
          currentUser = req.user && req.user.currentUser;

          // the object passed here becomes req.user
          // TODO currentAccount
          console.log('tumblr auth n');
          req.logIn({ newUser: data, currentUser: currentUser }, function (err) {
            if (err) { return next(err); }

            req.url = url;
            next();
          });
        })(req, res, next);
      }
    );
  }

  return route;
};
