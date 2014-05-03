'use strict';

    // looks for a username and password field in the request
var LocalStrategy = require('passport-local').Strategy
    // looks for an HTTP Authorization Basic header
  , BasicStrategy = require('passport-http').BasicStrategy
    // looks for an HTTP Authorization Bearer header
  , BearerStrategy = require('passport-http-bearer').Strategy
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
  profile.emails.forEach(function (emailObj) {
    // TODO should confirm e-mail address before allowing access, as facebook sometimes makes mistakes
    // see http://stackoverflow.com/questions/14280535/is-it-possible-to-check-if-an-email-is-confirmed-on-facebook
    ids.push({ type: 'email', value: emailObj.value });
  });

  return ids;
}

function basicLookup(clientId, clientSecret, done) {
  console.log('basicLookup not implemented');
  done(null, null);
}

function tokenLookup(token, done) {
  console.log('tokenLookup not implemented');
  done(null, null);
}

module.exports.init = function (passport, config, opts) {
  opts.Users.register('local', '1.0.0', getId, getIds);
  var passphraseStrategy
    , secretStrategy
    ;

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
  passport.use(new BearerStrategy(tokenLookup));


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
        console.log('info? what is this?');
        console.log(info);

        if (err) {
          res.send({ error: {
            message: "login failed: " + err.toString()
          , class: "AUTHENTICATION"
          , superclasses: []
          } });
          return;
        }

        console.log('local|basic|token authn');
        opts.login(req, res, next, {
          error: err
        , user: user
        , info: info
        , successUrl: '/api/users/me'
        });
      }
      passport.authenticate(type, handleSuccessOrFailure)(req, res, next);
    };
  }

  function route(rest) {
    rest.post('/api/session/bearer', handleLogin('bearer'));
    rest.post('/api/session/local', handleLogin('local'));
    rest.post('/api/session/basic', handleLogin('basic'));
  }

  return route;
};
