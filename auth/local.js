'use strict';

    // looks for a username and password field in the request
var LocalStrategy = require('passport-local').Strategy
    // looks for an HTTP Authorization Basic header
  , BasicStrategy = require('passport-http').BasicStrategy
    // looks for
      // HTTP Authorization Bearer header
      // `access_token` in form field
      // `access_token` URL query param
  , BearerStrategy = require('passport-http-bearer').Strategy
  , request = require('request')
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

  ids.push({ type: 'local', value: profile.id });

  return ids;
}


function formatProfile(token, profile) {
  return {
    type: 'local'
  , fkey: profile.id
  , profile: profile
  , accessToken: token
  //, refreshToken: refreshToken
  };
}

module.exports.init = function (passport, config, opts) {
  opts.Users.register('local', '1.0.0', getId, getIds);
  var passphraseStrategy
    , secretStrategy
    , bearerStrategy
    , fakeProfileUrl = 'http://api.randomuser.me/'
    , users = {}
    , Users = opts.Users
    ;

  function tokenLookup(token, done) {
    if (users[token]) {
      done(null, formatProfile(token, users[token]));
      return;
    }

    request.get(fakeProfileUrl, function (err, xreq, data) {
      var profile = JSON.parse(data).results[0]
        , user = profile.user
        ;

      user.name = profile.user.name.first + ' ' + profile.user.name.last[0];
      user.id = profile.seed;
      user.test = true;

      if (/test-.*(admin)/i.test(token)) {
        // can read and write privileged things
        user.test = true;
        user.role = 'admin';
      } else if (/test-.*(president)/i.test(token)) {
        // can read privileged things, but no write access
        user.test = true;
        user.role = 'president';
      } else if (/test-.*(user)/i.test(token)) {
        // can read and write
        user.test = true;
        user.role = 'user';
      } else if (/test-.*(guest)/i.test(token)) {
        // can read public stuff
        user.test = true;
        user.role = 'guest';
      }

      users[user.id] = user;
      users[token] = user;
      // TODO users[id+':'+'secret] = user;
      
      done(null, formatProfile(token, user));
    });
  }

  function basicLookup(clientId, clientSecret, done) {
    console.log('[basicLookup]');
    Users.readByIdAndSecret('local', clientId, clientSecret, function (err, user) {
      console.log('[basicLookup] user');
      console.log(user);
      done(err, user);
    });
  }

  //bearerStrategy = new BearerStrategy(tokenLookup);
  bearerStrategy = new BearerStrategy(function (token, done) {
    tokenLookup(token, function (err, user) {
      done(err, user);
    });
  });

  // username & password are intuitive,
  // but I much prefer passphrase at worst and,
  // preferably, the more generic id and secret
  passport.use(new LocalStrategy(basicLookup));

  passphraseStrategy = new LocalStrategy({ passwordField: 'passphrase' }, basicLookup);
  passphraseStrategy.name = 'local.passphrase';
  passport.use(passphraseStrategy);

  secretStrategy = new LocalStrategy({ usernameField: 'id', passwordField: 'secret' }, basicLookup);
  secretStrategy.name = 'local.secret';
  passport.use(secretStrategy);

  // http basic doesn't have named fields
  passport.use(new BasicStrategy(basicLookup));

  // and a token is a token
  passport.use(bearerStrategy);

  // Yes, custom callbacks have a lot of layers...
  // http://passportjs.org/guide/authenticate/#custom-callback
  //
  // Alternate approach:
  //  rest.get('/api/session/whatevs', passport.authenticate(
  //    'local'
  //  , { failureRedirect: '/login-failed.json'
  //    , successReturnToOrRedirect: '/api/me'
  //    //, successRedirect: '/api/me'
  //    }
  //  ));
  //
  //  negs: has a redirect, can't send specific error, can't manually login
  //  pros: appropriate api redirect will show up in the console
  function handleLogin(type) {
    return function (req, res, next) {
      function handleSuccessOrFailure(err, user, info) {
        if (err) {
          res.send({ error: {
            message: "login failed: " + err.toString()
          , code: "INVALID_AUTH"
          } });
          return;
        }

        opts.login(req, res, next, {
          error: err
        , user: user
        , info: info
        //, successUrl: '/api/users/me'
        //, successUrl: '/api/session'
        });
      }
      passport.authenticate(type, handleSuccessOrFailure)(req, res, next);
    };
  }

  function route(rest) {
    rest.post(config.apiPrefix + '/session/bearer', handleLogin('bearer'));
    rest.post(config.apiPrefix + '/session/local', handleLogin('local'));
    rest.post(config.apiPrefix + '/session/local', handleLogin('local.passphrase'));
    rest.post(config.apiPrefix + '/session/local', handleLogin('local.secret'));
    rest.post(config.apiPrefix + '/session/basic', handleLogin('basic'));
  }

  route.bearerStrategy = bearerStrategy;
  return route;
};
