'use strict';

/**
 * Module dependencies.
 */
var BasicStrategy = require('passport-http').BasicStrategy
  , ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy
  , oauth2 = require('./oauth2orize-logic')
  ;

module.exports.create = function (app, passport, config/*, DB, Auth*/) {

  var oauth2routables
    , db = require('./oauthy-dbs').create(app, config)
    //, Promise = require('bluebird').Promise
    , localBasicProvider
    , localClientPasswordProvider
    ;

  oauth2routables = oauth2.create(app, passport, config);

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
  localBasicProvider = new BasicStrategy(
    function (username, password, done) {
      db.consumers.findOne({ appId: username }, function (err, client) {
        if (err) { return done(err); }
        if (!client) { return done(null, false); }
        if (client.appSecret !== password) { return done(null, false); }
        return done(null, client);
      });
    }
  );
  localBasicProvider.name = 'provider.oauth2-basic.st';
  passport.use(localBasicProvider);

  localClientPasswordProvider = new ClientPasswordStrategy(
    function (appId, clientSecret, done) {
      db.consumers.findOne({ appId: appId }, function (err, client) {
        if (err) { return done(err); }
        if (!client) { return done(null, false); }
        if (client.appSecret !== clientSecret) { return done(null, false); }
        return done(null, client);
      });
    }
  );
  localClientPasswordProvider.name = 'provider.oauth2-client-password.st';
  passport.use(localClientPasswordProvider);

  // This is already done in sessionlogic/index.js
  /*
  app
    .use(passport.initialize())
    .use(passport.session())
    .use('/api', function (req, res, next) {
        console.log('[/api] pass by the api');
        if (req.user) {
          next();
          return;
        }

        //passport.authenticate('bearer.ldsorg', { session: false }),
        passport.authenticate('bearer.ldsorg', function (err, data) {
          if (err) {
            console.error('[bearerldsorg error]', err);
          }
          if (data) {
            console.log('[bearer.ldsorg data]');
            console.log(Object.keys(data));
          }
          if (err || (!data && !/^\/(login|session)$/.test(req.url))) {
            console.log('[bearer.ldsorg error] 401');
            res.send({ error: "Unauthorized access to /api", code: 401 });
            return;
          }

          //req.logIn();
          req.user = data;
          next();
        })(req, res, next);
      })
      ;
  */

  function route(rest) {
    oauth2routables.transactionTokens.forEach(function (ware) {
      rest.get('/oauth/transaction/:token', ware);
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
