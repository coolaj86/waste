'use strict';

/**
 * Module dependencies.
 */
var BasicStrategy = require('passport-http').BasicStrategy
  , ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy
  , oauth2 = require('./oauth2orize-logic')
  ;

module.exports.create = function (app, passport, config, DB, Auth) {
  var localBasicProvider
    , localClientPasswordProvider
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
  function getClient(id, privateKey, done) {
    // TODO should be DB.Apps or DB.Consumers or something of that nature, separate from user logins?
    Auth.AppLogin.login(null, id, privateKey).then(function ($client) {
      done(null, $client.toJSON());
    }).error(function (err) {
      if (/Incorrect/.test(err && err.message)) {
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

  return {
    route: oauth2.create(app, passport, config, DB, Auth)
  };
};
