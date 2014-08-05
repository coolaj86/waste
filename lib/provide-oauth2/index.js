'use strict';

/**
 * Module dependencies.
 */
var BasicStrategy = require('passport-http').BasicStrategy
  , ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy
  , oauth2 = require('./oauth2orize-logic')
  ;

module.exports.create = function (app, passport, config, DB, Auth) {

  var oauth2routables
    //, Promise = require('bluebird').Promise
    , localBasicProvider
    , localClientPasswordProvider
    ;

  oauth2routables = oauth2.create(app, passport, config, DB, Auth);

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
    function getClient(uid, privateKey, done) {
      // TODO should be DB.Apps or DB.Consumers or something of that nature, separate from user logins?
      Auth.AppLogin.forge({ uid: uid }).fetch()
        .then(
          function (client) {
            if (!client) {
              console.error("[oauth2-client] BAD UID");
              return done(null, false);
            }
            if (client.get('privateKey') !== privateKey) {
              console.error("[oauth2-client] BAD PRIVATE KEY");
              return done(null, false);
            }

            console.log("[oauth2-client] SUCCESS");
            // TODO maybe not toJSON?
            done(null, client.toJSON());
          }
        , function (err) {
            done(err);
          }
        )
        ;
    }
  localBasicProvider = new BasicStrategy(getClient);
  localBasicProvider.name = 'provider.oauth2-basic.st';
  passport.use(localBasicProvider);

  localClientPasswordProvider = new ClientPasswordStrategy(getClient);
  localClientPasswordProvider.name = 'provider.oauth2-client-password.st';
  passport.use(localClientPasswordProvider);

  function route(rest) {
    oauth2routables.transactionTokens.forEach(function (ware) {
      rest.get('/oauth/transaction/:token', ware);
    });

    oauth2routables.scopeTokens.forEach(function (ware) {
      rest.get('/oauth/scope/:token', ware);
    });

    oauth2routables.authorization.forEach(function (ware) {
      rest.get('/dialog/authorize', ware); // deprecated
      rest.get('/oauth/dialog/authorize', ware);
    });

    oauth2routables.decision.forEach(function (ware) {
      if (Array.isArray(ware)) {
        ware.forEach(function (ware) {
          rest.post('/dialog/authorize/decision', ware); // deprecated
          rest.post('/oauth/dialog/authorize/decision', ware);
        });
      } else {
        rest.post('/dialog/authorize/decision', ware); // deprecated
        rest.post('/oauth/dialog/authorize/decision', ware);
      }
    });

    oauth2routables.token.forEach(function (ware) {
      rest.post('/oauth/token', ware);
    });
  }

  return {
    route: route
  };
};
