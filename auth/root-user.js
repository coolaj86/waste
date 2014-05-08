'use strict';

    // looks for a username and password field in the request
var LocalStrategy = require('passport-local').Strategy
    // looks for an HTTP Authorization Basic header
  , BasicStrategy = require('passport-http').BasicStrategy
  , rootConfig = require('../config').root
  , secretUtils = require('./utils')
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

  ids.push({ type: 'root', value: profile.id });

  return ids;
}


function basicLookup(clientId, clientSecret, done) {
  var secretHash
    , profile
    ;

  if ('root' !== clientId) {
    // next()
    done(null, null);
    return;
  }

  secretHash = secretUtils.testSecretHash(rootConfig.salt, clientSecret, rootConfig.type);
  if (rootConfig.secret !== secretHash) {
    done(new Error('basicLookup not implemented'), null);
    return;
  }

  profile = {
    id: 'root'
  };
  done(null, {
    type: 'root'
  , fkey: profile.id
  , profile: profile
  });
}

module.exports.init = function (passport, config, opts) {
  opts.Users.register('root', '1.0.0', getId, getIds);
  var localRootStrategy
    , basicRootStrategy
    ;

  localRootStrategy = new LocalStrategy({ usernameField: 'id', passwordField: 'secret' }, basicLookup);
  localRootStrategy.name = 'root.local';
  passport.use(localRootStrategy);

  basicRootStrategy = new BasicStrategy(basicLookup);
  basicRootStrategy.name = 'root.basic';
  passport.use(basicRootStrategy);

  function handleLogin(type) {
    return function (req, res, next) {
      function handleSuccessOrFailure(err, user, info) {
        if (!err && !user) {
          next();
          return;
        }

        if (err) {
          res.send({ error: {
            message: "login failed: " + err.toString()
          , code: "ADMIN_AUTH"
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
    rest.post('/api/session/local', handleLogin('root.local'));
    rest.post('/api/session/basic', handleLogin('root.basic'));
  }

  return route;
};
