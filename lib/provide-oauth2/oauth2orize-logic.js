'use strict';

/**
 * Module dependencies.
 */
var oauth2orize = require('oauth2orize')
  //, login = require('connect-ensure-login')
  , utils = require('../utils')
  , escapeRegExp = require('escape-string-regexp')
  , UUID = require('node-uuid')
  ;

module.exports.create = function (app, passport, config, DB, Auth) {
  var db = config.db
    , routes = {}
    , server
      // in-memory only
    , transactionTokens = {}
    ;

  // create OAuth 2.0 server
  server = oauth2orize.createServer();

  // Register serialialization and deserialization functions.
  //
  // When a client redirects a user to user authorization endpoint, an
  // authorization transaction is initiated.  To complete the transaction, the
  // user must authenticate and approve the authorization request.  Because this
  // may involve multiple HTTP request/response exchanges, the transaction is
  // stored in the session.
  //
  // An application must supply serialization functions, which determine how the
  // client object is serialized into the session.  Typically this will be a
  // simple matter of serializing the client's ID, and deserializing by finding
  // the client by ID from the database.

  server.serializeClient(function (consumer, done) {
    console.log('[serializeClient]');
    /*
    db.clients.create(consumer, function (err, id) {
      done(null, id);
    });
    */
    // TODO make appId?
    done(null, consumer.appId);
  });

  server.deserializeClient(function (appId, done) {
    console.log('[deserializeClient]');
    db.consumers.findOne({ appId: appId }, function (err, consumer) {
      if (err) { return done(err); }
      done(null, consumer);
    });
  });

  // Register supported grant types.
  //
  // OAuth 2.0 specifies a framework that allows users to grant client
  // applications limited access to their protected resources.  It does this
  // through a process of the user granting access, and the client exchanging
  // the grant for an access token.

  // Grant authorization codes.  The callback takes the `client` requesting
  // authorization, the `redirectURI` (which is used as a verifier in the
  // subsequent exchange), the authenticated `user` granting access, and
  // their response, which contains approved scope, duration, etc. as parsed by
  // the application.  The application issues a code, which is bound to these
  // values, and will be exchanged for an access token.

  server.grant(oauth2orize.grant.code(function (consumer, redirectURI, user, ares, done) {
    console.log('[grant code]', consumer.appId, user.id);
    var code = consumer.appId + ':' + utils.uid(16)
      , values
      ;
      
    values = {
      userId: user.id
    , scope: ares.scope
    , appId: consumer.appId
    , redirectURI: redirectURI
    , ts: Date.now()
    };

    console.log('[grant] values', consumer.appId, user.id);
    console.log(values);
    console.log('ares.keys()');
    console.log(Object.keys(ares));
    console.log('ares');
    console.log(ares);

    db.permissions.set(user.id, consumer.appId, ares.newScope);
    db.authorizationCodes.save(code, values, function (err) {
      if (err) { return done(err); }
      done(null, code);
    });
  }));

  // Grant implicit authorization.  The callback takes the `client` requesting
  // authorization, the authenticated `user` granting access, and
  // their response, which contains approved scope, duration, etc. as parsed by
  // the application.  The application issues a token, which is bound to these
  // values.

  server.grant(oauth2orize.grant.token(function (consumer, user, ares, done) {
    console.log('[grant token]', consumer.appId);
    var token = utils.uid(256)
      , values
      ;

    values = {
      userId: user.id
    , scope: ares.scope
    , appId: consumer.appId
    };

    console.log('grant2 token', values);
    Auth.Logins.create({ uid: token, info: values }).then(function () {
      done(null, token);
    }, function (err) {
      done(err);
    });
  }));

  // Exchange authorization codes for access tokens.  The callback accepts the
  // `client`, which is exchanging `code` and any `redirectURI` from the
  // authorization request for verification.  If these values are validated, the
  // application issues an access token on behalf of the user who authorized the
  // code.

  server.exchange(oauth2orize.exchange.code(function (consumer, code, redirectURI, done) {
    console.log('[exchange code]');
    db.authorizationCodes.find(code, function (err, authCode) {
      if (err) { return done(err); }
      if (consumer.appId !== authCode.appId) { return done(null, false); }
      //if (redirectURI !== authCode.redirectURI) { return done(null, false); }
      
      var token = utils.uid(256)
        , values
        ;
        
      values = {
        userId: authCode.userId
      , scope: authCode.scope
      , appId: consumer.appId
      };


      // TODO all of these should use realCreate
      Auth.Logins.create({ uid: token, info: values }).then(function () {
        done(null, token);
      }, function (err) {
        done(err);
      });
    });
  }));

  // Exchange user id and password for access tokens.  The callback accepts the
  // `client`, which is exchanging the user's name and password from the
  // authorization request for verification. If these values are validated, the
  // application issues an access token on behalf of the user who authorized the code.
  /*
  server.exchange(oauth2orize.exchange.password(function (consumer, username, password, scope, done) {

      //Validate the client
      db.clients.findByClientId(consumer.appId, function (err, localClient) {
          if (err) { return done(err); }
          if (localClient === null) {
            return done(null, false);
          }
          if (localClient.clientSecret !== consumer.clientSecret) {
            return done(null, false);
          }
          //Validate the user
          db.users.findByUsername(username, function (err, user) {
            if (err) { return done(err); }
            if(user === null) {
              return done(null, false);
            }
            if(password !== user.password) {
              return done(null, false);
            }
            //Everything validated, return the token
            var token = utils.uid(256)
              , values = {
                  userId: user.id
                , scope: scope
                , appId: consumer.appId
                }
              ;

            db.accessTokens.save(token, values, function (err) {
              if (err) { return done(err); }
              done(null, token);
            });
          });
      });
  }));
  */

  // Exchange the client id and password/secret for an access token.  The callback accepts the
  // `client`, which is exchanging the client's id and password/secret from the
  // authorization request for verification. If these values are validated, the
  // application issues an access token on behalf of the client who authorized the code.
  /*
  server.exchange(oauth2orize.exchange.clientCredentials(function (client, scope, done) {

      //Validate the client
      db.clients.findByClientId(client.appId, function (err, localClient) {
        if (err) { return done(err); }
        if(localClient === null) {
          done(null, false);
          return;
        }
        if(localClient.clientSecret !== client.clientSecret) {
          done(null, false);
          return;
        }

        var token = utils.uid(256)
          , values = {
              //Pass in a null for user id since there is no user with this grant type
              userId: null
            , scope: scope
            , appId: localClient.appId
            }
          ;

        db.accessTokens.save(token, values, function (err) {
          if (err) { return done(err); }
          done(null, token);
        });
      });
  }));
  */

  // Traditionally all of the oauth cruft has been handled in html alone,
  // but we handle ensuring the login and the transaction via the same app
  // that the user uses regularly.
  // In some future version (assuming a future where there are clients that don't run JavasScript)
  // we may provide an alternate url such as /oauth/html/xyz for a more mucky user experience
  routes.transactionTokens = [
    function (req, res) {
      var txtoken = req.params.token
        ;

      if (!txtoken) {
        res.send({ error: { message: "no transaction token specified" } });
        return;
      }

      if (!transactionTokens[txtoken]) {
        res.send({ error: { message: "invalid or expired transaction token" } });
        return;
      }

      clearTimeout(transactionTokens[txtoken].timeoutToken);
      delete transactionTokens[txtoken].timeoutToken;
      req.send(transactionTokens[txtoken]);
      delete transactionTokens[txtoken];
    }
  ];

  // user authorization endpoint
  //
  // `authorization` middleware accepts a `validate` callback which is
  // responsible for validating the client making the authorization request.  In
  // doing so, is recommended that the `redirectURI` be checked against a
  // registered value, although security requirements may vary accross
  // implementations.  Once validated, the `done` callback must be invoked with
  // a `client` instance, as well as the `redirectURI` to which the user will be
  // redirected after an authorization decision is obtained.
  //
  // This middleware simply initializes a new authorization transaction.  It is
  // the application's responsibility to authenticate the user and render a dialog
  // to obtain their approval (displaying details about the client requesting
  // authorization).  We accomplish that here by routing through `ensureLoggedIn()`
  // first, and rendering the `dialog` view. 

  routes.authorization = [
    //login.ensureLoggedIn('/login.html') // this will be handled in the browser
    server.authorization(
      function checkAppIdAndUrl(appId, redirectURI, scope, type, done) {
        console.log('[authorize.validateUrl]', appId);
        console.log('scope');
        console.log(scope);
        console.log('type');
        console.log(type);
        db.consumers.findOne({ appId: appId }, function (err, consumer) {
          var long
            , short
            ;

          if (err) {
            console.error('db.consumers.findOne error');
            console.error(err);
            done(err);
            return;
          }

          // XXX Upgrade to a more rigorous security check.
          // but also allow for localhost and alternate port testing
          long = redirectURI.replace(/^https?:\/\/([^\/:]+).*/i, '$1');
          short = (consumer.url||'').replace(/^https?:\/\/([^\/:]+).*/i, '$1');

          if (!consumer.guest && !long.match(new RegExp(escapeRegExp(short) + '$', 'i'))) {
            done(new Error(
              "Security Error: \nRedirect URL '"
            + redirectURI
            + "' does not match app domain '"
            + (consumer.url||'')
            + "'.\n\n\n"
            ));
            return;
          }

          done(null, consumer, redirectURI);
        });
      }
    , function checkAuthorizationAndScope(consumer, user, rawScope, done) {
        console.log('[authorize.validateScope]');
        if (consumer.guest && !(user.guest || user.meta.guest)) {
          done(new Error("'" + consumer.name + "' is a demo app and may only be used by demo user accounts, not real ones.\n\n\n"));
        }

        // We only want to ask the user to grant this application permissions
        // that the user has not yet given it before.
        // However, this auth code should be bound to the scope it requested
        db.permissions.delta(user.id, consumer.appId, { rawScope: rawScope }, function (err, newScope, invalids, reqScope) {
          var info
            ;
          info = {
            newScope: newScope // wrapped with scope
          , invalids: invalids
          , rawScope: rawScope
          , requestedScope: reqScope // wrapped with scope
          };

          // TODO compare current scope request with previously granted scope
          console.log('scope');
          console.log(rawScope);
          console.log('info.new');
          console.log(info);

          // just a nasty hack until this issue is solved
          // https://github.com/jaredhanson/oauth2orize/issues/86
          //scope.info = info;

          // this third argument is for options that get passed to the dialog
          // for example, showing new scope to allow
          if (0 === Object.keys(newScope.scope).length) {
            // nothing new to ask for
            done(null, true, info);
          } else {
            // there are new things to ask for
            done(null, false, info);
          }
        });
      }
    )
  , function askUserToAllowScope(req, res /*, next*/) {
      console.log('[render dialog]');
      var head = req.user.meta.currentHousehold.headOfHousehold
        , house = req.user.meta.currentHousehold.householdInfo
        , name = head.name.split(/, /)
        , client = req.oauth2.client
        , authReq = req.oauth2.req
        , authInfo = req.oauth2.info
        , scope = authReq.scope
        , txtoken = UUID.v4()
        ;

      console.log('authReq.scope');
      console.log(authReq.scope);
      console.log('authInfo');
      console.log(authInfo);

      /*
      req.oauth2
      { client: [Object whatever]
         { name: 'Example App Name',
           appId: 'exmaple-app-id',
           appSecret: 'something-super-secret' },
        redirectURI: 'http://beta.ysawards.org:3000/api/auth/ldsconnect/callback',
        req:
         { type: 'code',
           clientID: 'ysawards-6',
           redirectURI: 'http://beta.ysawards.org:3000/api/auth/ldsconnect/callback',
           scope:
            [ 'stake.adults:name,photo,phone,email::texting,emailing',
              'stake.leadership:name,photo,phone,email::texting,emailing' ],
           state: undefined },
        user: [Object whatever]
          { id: '',
            meta: {} },
        transactionID: 'dzxW37I7' }
      */

      client.logo = client.logo || '/images/app.png';
      // TODO store this in a tmp store that is accessible through the api
      // for retrieval as json

      transactionTokens[txtoken] = {
        transactionId: req.oauth2.transactionID
      , user: {
          name: name[1] + ' ' + name[0]
        , photo: head.imageData || house.imageData || '/images/photo.jpg'
        }
      , scope: scope
      , permissions: db.permissions.stringify(authInfo.newScope)
      , client: req.oauth2.client
      , url: req.url // where to post to
      , body: req.body
      };

      transactionTokens[txtoken].timeoutToken = setTimeout(function () {
        delete transactionTokens[txtoken];
      }, 5 * 60 * 1000);

      // TODO update browser client to use html5 url state and pass this through to index.html
      // req.url = '/' // browser should handle /oauth/dialog/authorize
      res.redirect('/#/authorize');
      //res.render('dialog', );
    }
  ];

  // user decision endpoint
  //
  // `decision` middleware processes a user's decision to allow or deny access
  // requested by a client application.  Based on the grant type requested by the
  // client, the above grant middleware configured above will be invoked to send
  // a response.

  routes.decision = [
  //  login.ensureLoggedIn() // the browser app will handle this
    server.decision(function parseDecision(req, done) {
      // TODO create req.oauth2.res.grantedScope
      // according to req.oauth2.res.newScope and req.body
      req.oauth2.info.body = req.body;
      done(null, req.oauth2.info);
    })
  ];


  // token endpoint
  //
  // `token` middleware handles client requests to exchange authorization grants
  // for access tokens.  Based on the grant type being exchanged, the above
  // exchange middleware will be invoked to handle the request.  Clients must
  // authenticate when making requests to this endpoint.

  routes.token = [
    passport.authenticate(['provider.oauth2-basic.st', 'provider.oauth2-client-password.st'], { session: false })
  , server.token()
  , server.errorHandler()
  ];

  return routes;
};
