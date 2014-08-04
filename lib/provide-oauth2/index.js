'use strict';

/**
 * Module dependencies.
 */
var BasicStrategy = require('passport-http').BasicStrategy
  , ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy
  , BearerStrategy = require('passport-http-bearer').Strategy
  , oauth2 = require('./oauth2orize-logic')
  ;

module.exports.create = function (app, passport, config, DB/*, Auth*/) {

  var oauth2routables
    , db = require('./oauthy-dbs').create(app, config)
    //, Promise = require('bluebird').Promise
    , ldsorgBearerStrategy
    , ldsconnectBasicProvider
    , ldsconnectClientPasswordProvider
    ;

  oauth2routables = oauth2.init(app, passport, config);

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
  ldsconnectBasicProvider = new BasicStrategy(
    function (username, password, done) {
      db.consumers.findOne({ appId: username }, function (err, client) {
        if (err) { return done(err); }
        if (!client) { return done(null, false); }
        if (client.appSecret !== password) { return done(null, false); }
        return done(null, client);
      });
    }
  );
  ldsconnectBasicProvider.name = 'provider.basic.ldsconnect';
  passport.use(ldsconnectBasicProvider);

  ldsconnectClientPasswordProvider = new ClientPasswordStrategy(
    function (appId, clientSecret, done) {
      db.consumers.findOne({ appId: appId }, function (err, client) {
        if (err) { return done(err); }
        if (!client) { return done(null, false); }
        if (client.appSecret !== clientSecret) { return done(null, false); }
        return done(null, client);
      });
    }
  );
  ldsconnectClientPasswordProvider.name = 'provider.oauth2-client-password.ldsconnect';
  passport.use(ldsconnectClientPasswordProvider);

  /**
   * BearerStrategy
   *
   * This strategy is used to authenticate either users or clients based on an access token
   * (aka a bearer token).  If a user, they must have previously authorized a client
   * application, which is issued an access token to make requests on behalf of
   * the authorizing user.
   */
  ldsorgBearerStrategy = new BearerStrategy(
    function (accessToken, done) {
      db.accessTokens.find(accessToken, function (err, token) {
        if (err) {
          console.error('[invalid token]');
          return done(err);
        }
        if (!token) {
          console.error('[token] !token');
          return done(null, false);
        }

        if (token.userId !== null) {
          DB.Logins.get(token.userId).then(
            function (user) {
              if (!user) { return done(null, false); }
              // to keep this example simple, restricted scopes are not implemented,
              // and this is just for illustrative purposes
              var info = { scope: '*', user: true }
                ;

              done(null, user, info);
            }
          , function (err) {
              if (err) {
                console.error('[invalid user]', "no user '" + token.userId + "'");
                return done(err);
              }
            }
          );
        } else {
          //The request came from a client only since userID is null
          //therefore the client is passed back instead of a user
          db.consumers.findOne({ appId: token.appId }, function (err, client) {
            if (err) { return done(err); }
            if (!client) { return done(null, false); }
            // to keep this example simple, restricted scopes are not implemented,
            // and this is just for illustrative purposes
            var info = { scope: '*', consumer: true }
              ;

            done(null, client, info);
          });
        }
      });
    }
  );
  ldsorgBearerStrategy.name = 'bearer.ldsorg';
  passport.use(ldsorgBearerStrategy);

  app
  /*
    // This is already done in sessionlogic/index.js
    .use(passport.initialize())
    .use(passport.session())
  */
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

  function route(rest) {
    /*
    rest.get('/', site.index);
    rest.post('/login', site.login);
    rest.get('/logout', site.logout);
    rest.get('/account', site.account);
    */

    oauth2routables.authorization.forEach(function (ware) {
      rest.get('/dialog/authorize', ware);
    });
    oauth2routables.decision.forEach(function (ware) {
      if (Array.isArray(ware)) {
        ware.forEach(function (ware) {
          rest.post('/dialog/authorize/decision', ware);
        });
      } else {
        rest.post('/dialog/authorize/decision', ware);
      }
    });
    oauth2routables.token.forEach(function (ware) {
      rest.post('/oauth/token', ware);
    });

    /*
     * lds.org api wrapping
     */
    rest.post(
      '/api/login'
    /*
    , function (req, res, next) {
        passport.authenticate('local.ldsorg', function (err, user) {
          if (!user) {
            res.redirect('/login.html');
          }

          req.login(user, function (err) {
            if (err) {
              console.error(err);
            }
            res.render('account', { json: JSON.stringify(user.meta) });
          });
        })(req, res, next);
      }
    */
      // TODO provide a different login endpoint for oauth vs same origin
    , passport.authenticate('local.ldsorg', { successReturnToOrRedirect: '/api/ldsorg/me', failureRedirect: '/login.html#error=authentication_failed' })
    );
    rest.get(
      '/api/session'
    , function (req, res) {
        // hmmm... to differentiate between guest user and no user (guest)
        res.send({});
      }
    );
    rest.post(
      '/api/session'
    , passport.authenticate('local.ldsorg', { successReturnToOrRedirect: '/api/ldsorg/me', failureRedirect: '/login.html#error=authentication_failed' })
    );
    rest.get('/logout', function (req, res) {
      var body
        ;

      body = "<script>setTimeout(function () { window.open('', '_self', ''); window.close(); }, 800);</script>";
      req.logout();
      res.end(body);
    });
    rest.delete('/api/session', function (req, res) {
      var user = req.user
        ;

      req.logout();
      res.send({ success: true, userId: user.id });
    });
  }

  return {
    route: route
  };
};
