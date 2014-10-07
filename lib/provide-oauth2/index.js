'use strict';

/**
 * Module dependencies.
 */
var BasicStrategy = require('passport-http').BasicStrategy
  , ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy
  , ResourceOwnerPasswordStrategy = require('passport-oauth2-resource-owner-password').Strategy
  , oauth2 = require('./oauth2orize-logic')
  ;

module.exports.create = function (app, passport, config, DB, Auth) {
  var localBasicProvider
    , localClientPasswordProvider
    , localResourceOwnerPasswordProvider
    ;

  /**
   * BasicStrategy & ClientPasswordStrategy
   *
   * These strategies are used to authenticate registered OAuth clients.  They are
   * employed to protect the `token` endpoint, which consumers use to obtain
   * access tokens.  The OAuth 2.0 specification suggests that clients use the
   * HTTP Basic scheme to authenticate.  Use of the client password strategy
   * allows clients to send the same credentials in the request body (as opposed
   * to the `Authorization` header).  While this approach is not recommended by
   * the specification, in practice it is quite common.
   */
  function getClient(pub, secret, done) {
    // TODO should be DB.Apps or DB.Consumers or something of that nature, separate from user logins?
    Auth.AppLogin.login(null, pub, secret).then(function ($key) {
      done(null, $key.toJSON());
    }).error(function (err) {
      if (/Incorrect/i.test(err && err.message)) {
        done(null, false);
      } else {
        console.error('ERROR APP LOGIN UNKNOWN ERROR');
        console.error(err);
        done(err);
      }
    }).catch(function (err) {
      console.error('ERROR APP LOGIN UNCAUGHT');
      console.error(err);
      done(err);
    });
  }

  /**
   * ResourceOwnerPasswordStrategy
   *
   * This strategy is used to authenticate registered OAuth clients WITH users'
   * credentials. It is employed to protect the `token` endpoint, which consumers
   * use to obtain access tokens on behalf of the users supplying credentials.
   * This is primary for use with privileged applications in insecure environments
   * (such as an official mobile app)
   */
  function getClientAndUser(pub, secret, user, pass, done) {
    Auth.AppLogin.login(null, pub, secret).then(function ($key) {
      var key = $key.toJSON()
        ;

      //TODO Auth.LocalLogin.login()
      done(null, key, user, pass);
      //done(null, $key.toJSON());
    }).error(function (err) {
      if (/Incorrect/i.test(err && err.message)) {
        done(null, false);
      } else {
        console.error('ERROR APP LOGIN UNKNOWN ERROR');
        console.error(err);
        done(err);
      }
    }).catch(function (err) {
      console.error('ERROR APP LOGIN UNCAUGHT');
      console.error(err);
      done(err);
    });
  }

  localBasicProvider = new BasicStrategy(getClient);
  localBasicProvider.name = 'provider.oauth2-basic.st';
  passport.use(localBasicProvider);

  localClientPasswordProvider = new ClientPasswordStrategy(getClient);
  localClientPasswordProvider.name = 'provider.oauth2-client-password.st';
  passport.use(localClientPasswordProvider);

  localResourceOwnerPasswordProvider = new ResourceOwnerPasswordStrategy(getClientAndUser);
  localResourceOwnerPasswordProvider.name = 'provider.oauth2-resource-owner-password.st';
  passport.use(localResourceOwnerPasswordProvider);

  return {
    route: oauth2.create(app, passport, config, DB, Auth)
  };
};
