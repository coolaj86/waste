'use strict';

/**
 * Module dependencies.
 */
var oauth2orize = require('oauth2orize')
  //, login = require('connect-ensure-login')
  , utils = require('./oauthy-dbs/utils')
  //, escapeRegExp = require('escape-string-regexp')
  , UUID = require('node-uuid')
  ;

module.exports.create = function (app, passport, config, DB, Auth) {
  var routes = {}
    , server
      // in-memory only
    , db = require('./oauthy-dbs').create()
    , Promise = require('bluebird').Promise
    , TxTok
    ;

  function createTxTok() {
    var transactionTokens = {}
      ;

    function TxTok() {
    }
    TxTok.create = function () {
      return UUID.v4(); //utils.uid(256);
    };
    TxTok.put = function (token, stuff) {
      transactionTokens[token] = {
        timeout: setTimeout(function () {
          delete transactionTokens[token];
        }, 5 * 60 * 1000)
      , data: stuff
      };
    };
    TxTok.del = function (token) {
      var stuff = transactionTokens[token]
        ;
        
      delete transactionTokens[token];

      if (!stuff) {
        return null;
      }

      clearTimeout(stuff.timeout);

      return stuff.data;
    };
    TxTok.get = function (token) {
      var stuff = transactionTokens[token]
        ;
   
      return stuff && stuff.data;
    };
    return TxTok;
  }
  
  TxTok = createTxTok();

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
    console.log(consumer);
    // TODO might need to change
    done(null, consumer.uid || consumer.get('uid'));
  });

  server.deserializeClient(function (appUid, done) {
    console.log('[deserializeClient]');


    // BUG
    // TODO this will create, but should be replaced with a separate db
    // that does not auto-create
    Auth.AppLogin.login({ uid: appUid }).then(function (appLogin) {
      console.log('APP_LOGIN_2');
      console.log(appUid);
      console.log(appLogin);
      done(null, appLogin && appLogin.toJSON());
    }, function (err) {
      done(err);
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

  function getUserAccount(user) {
    var account
      ;

    if (1 === user.accounts.length) {
      // TODO why did this not have a primary account id?
      account = user.accounts[0];
    } else {
      user.accounts.forEach(function (a) {
        if (a.id === user.selectedAccountId) {
          account = a;
        }
      });
    }

    return account;
  }

  server.grant(oauth2orize.grant.code(function (consumer, redirectURI, user, ares, done) {
    console.log('[grant code]', consumer.uid || consumer.get('uid'), user.id);
    var code = (consumer.uid || consumer.get('uid')) + ':' + utils.uid(16)
      , values
      , account
      ;
      
    console.log(consumer);

    account = getUserAccount(user);
    if (!account) {
      done({ error: { message: "account could not be retrieved from logged-in user. TODO pre-guarantee this" } });
      return;
    }

    values = {
      appId: consumer.uid || consumer.get('uid')
    , accountId: account.id
    , scope: ares.scope
    , redirectURI: redirectURI
    , ts: Date.now()
    };

    console.log('[grant] values', consumer.uid || consumer.get('uid'), user.id);
    console.log(values);
    console.log('ares.keys()');
    console.log(Object.keys(ares));
    console.log('ares');
    console.log(ares);

    console.log('[grantCode] user');
    console.log(user);
    db.permissions.set(user.id, (consumer.uid || consumer.get('uid')), ares.newScope);
    console.log('grant2 token', values);

    TxTok.put(code, values);

    done(null, code);
    /*
    // I think these are one-time use
    db.authorizationCodes.save(code, values, function (err) {
      if (err) { return done(err); }
      done(null, code);
    });
    */
  }));

  // Grant implicit authorization.  The callback takes the `client` requesting
  // authorization, the authenticated `user` granting access, and
  // their response, which contains approved scope, duration, etc. as parsed by
  // the application.  The application issues a token, which is bound to these
  // values.

  function hasAccount(accounts, accountId) {
    if (!accounts) { return false; }
    return accounts.some(function (a) {
      return a.id === accountId;
    });
  }

  server.grant(oauth2orize.grant.token(function (consumer, user, ares, done) {
    console.log('[grant token]', consumer.uid || consumer.get('uid'));
    var token = utils.uid(256)
      , values
      , account
      ;

    account = getUserAccount(user);
    values = {
      appId: consumer.uid || consumer.get('uid')
    , accountId: account.id
    , scope: ares.scope
    };

    console.log('[oauth2orize-logic] bearer token, user id, app id');
    console.log(account.id);
    console.log(token);
    console.log(consumer.uid || consumer.get('uid'));
    Auth.BearerLogin.create(
      { appId: values.appId
      , accountId: values.accountId
      , scope: values.scope
      , uid: token
      }
    , account
    ).then(function (login) {
      var hasEm
        ;

      if (!account) {
        throw new Error('no account 1');
      }

      hasEm = hasAccount(login.related('accounts'), account.id);
      console.log('HAS EM 1 ---------------------', account.id);
      console.log(hasEm);
      if (account && !hasAccount(login.related('accounts'), account.id)) {
        // TODO singular
        // bearer.related('account').attach(account)
        login.related('accounts').attach(account.id)
          .then(function () {
            done(null, token);
          });
      } else {
        done(null, token);
      }
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
    //, token = utils.uid(256)
    var grantValues = TxTok.del(code)
      , values
      ;

    if (!grantValues) {
      console.error('[oauth2orize-logic] grant code exchange');
      console.error(code);
      console.error(consumer);
      done(new Error('Invalid Grant Code'));
      return;
    }

    console.log('[exchange code]');

    if ((consumer.uid || consumer.get('uid')) !== grantValues.appId) { return done(null, false); }
    //if (redirectURI !== authCode.redirectURI) { return done(null, false); }
      
    values = {
      accountId: grantValues.accountId
    , appId: grantValues.appId
    , scope: grantValues.scope
    };

    // TODO all of these should use realCreate
    DB.Accounts.forge({ uuid: grantValues.accountId }).fetch().then(function (account) {
      if (!account) {
        console.error('[oauth2orize-logic] no account');
        console.error();
        done(null, null);
        return null;
      }
      return Auth.BearerLogin.create(
        { appId: grantValues.appId
        , accountId: grantValues.accountId
        , scope: grantValues.scope
        }
      , account
      ).then(function (login) {
        var hasEm
          , token
          ;

        token = login.get('uid');

        if (!grantValues.accountId) {
          throw new Error('no account 2');
        }
        hasEm = hasAccount(login.related('accounts'), grantValues.accountId);
        console.log('HAS EM 2 ---------------------', grantValues.accountId);
        console.log(hasEm);
        if (grantValues.accountId && !hasEm) {
          // TODO singular
          // bearer.related('account').attach(account)
          login.related('accounts').attach(grantValues.accountId)
            .then(function () {
              done(null, token);
            });
        } else {
          done(null, token);
        }
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
                  accountId: account.id
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
              accountId: null
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
  // but we handle ensuring the login and the transaction via the browser app instead of
  // creating another smaller app just for the sake of oauth
  //
  // In some future version (assuming a future where there are clients that don't run JavasScript)
  // we may provide an alternate url such as /oauth/html/xyz for a more mucky user experience
  //
  routes.transactionTokens = [
    function (req, res) {
      var txtoken = req.params.token
        , data
        ;

      if (!txtoken) {
        res.send({ error: { message: "no transaction token specified" } });
        return;
      }

      data = TxTok.del(txtoken);
      if (!data) {
        res.send({ error: { message: "invalid or expired transaction token" } });
        return;
      }

      req.send(data);
    }
  ];

  function getScopeDelta(accountId, consumerId, rawScope) {
    return new Promise(function (resolve/*, reject*/) {
      // We only want to ask the user to grant this application permissions
      // that the user has not yet given it before.
      // However, this auth code should be bound to the scope it requested
      db.permissions.delta(
        accountId
      , consumerId
      , { rawScope: rawScope }
      , function (err, newScope, invalids, reqScope, exists) {
          var info
            ;

          info = {
            newScope: newScope // wrapped with scope
          , invalids: invalids
          , rawScope: rawScope
          , requestedScope: reqScope // wrapped with scope
          , exists: exists
          , reqScope: reqScope
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
            info.granted = true && exists;
          } else {
            // there are new things to ask for
            info.granted = false;
          }

          resolve(info);
        }
      );
    });
  }

  routes.scopeTokens = [
    function restfulGetScopeDelta(req, res) {
      var txtoken = req.params.token
        , data = TxTok.get(txtoken)
        , account
        ;

      if (!req.user || !req.params.token || !data) {
        res.send({ error: { message: "I would like to help you, but I can't. I would like to tell you to login and resubmit your request along with your scope, but I can't. I would like to tell you to fill out forms E17, K609, A-4, and go to the first office to your left on the 3rd floor to submit them, but I can't. Sorry. (Now act upset)." } });
        return;
      }

      console.log('[scopeToken] req.user');
      console.log(req.user);

      // TODO make this part of the /api/me resource as /api/me/scope/:appid/:txtoken ???
      // and guard all access to /api/me as follows (and attach it to req.me or req.account):
      if (1 === req.user.accounts.length) {
        // TODO why did this not have a primary account id?
        account = req.user.accounts[0];
      } else {
        req.user.accounts.forEach(function (a) {
          if (a.id === req.user.selectedAccountId) {
            account = a;
          }
        });
      }
      if (!account) {
        res.send({ error: { message: "you must specify oauth scope within the context of a specific account" } });
        return;
      }

      getScopeDelta(data.accountId, data.appId, data.rawScope).then(function (stuff) {
        Object.keys(stuff).forEach(function (k) {
          data[k] = stuff[k];
        });
        res.send(data);
      }, function (err) {
        res.send({ error: { message: err && err.message || err || "scope delta failure" }});
      });
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

        // BUG
        // TODO this will create, but should be replaced with a separate db
        // that does not auto-create
        Auth.AppLogin.login({ uid: appId }).then(function (appLogin) {
          console.log('APP_LOGIN');
          console.log(redirectURI);
          console.log(appId);
          console.log(appLogin.toJSON());
          //console.log(appLogin);
          // XXX temporarily disabled for testing
          /*
          var long
            , short
            ;

          // XXX Upgrade to a more rigorous security check.
          // but also allow for localhost and alternate port testing
          long = redirectURI.replace(/^https?:\/\/([^\/:]+).*$/i, '$1');
          short = (appLogin.get('url')||'').replace(/^https?:\/\/([^\/:]+).*$/i, '$1');

          if (!appLogin.get('guest') && !long.match(new RegExp(escapeRegExp(short) + '$', 'i'))) {
            done(new Error(
              "Security Error: \nRedirect URL '"
            + redirectURI
            + "' does not match app domain '"
            + (appLogin.get('url')||'')
            + "'.\n\n\n"
            ));
            return;
          }
          */

          done(null, appLogin && appLogin.toJSON(), redirectURI);
        }, function (err) {
          console.error('Auth.AppLogin error');
          console.error(err);
          done(err);
        });
      }
    , function checkAuthorizationAndScope(consumer, user, rawScope, done) {
        var account = account && getUserAccount(user)
          , accountId = account && account.id
          , data = { accountId: accountId, appId: consumer.uid || consumer.get('uid'), rawScope: rawScope }
          ;

        console.log('[authorize.validateScope]');
        console.log(consumer);
        console.log(user);
        console.log(rawScope);
        if (consumer.guest && !(user.guest || user.meta.guest)) {
          done(new Error("'" + consumer.name + "' is a demo app and may only be used by demo user accounts, not real ones.\n\n\n"));
        }

        if (!user) {
          // we'll handle user login and scope checking in the browser
          // none shall pass
          done(null, false, data);
          return;
        }

        getScopeDelta(user, consumer, rawScope).then(function (scopeInfo) {
          // true: the scope has been accepted previously
          // false: continue in the chain to show the dialog to ask for permission
          Object.keys(scopeInfo).forEach(function (k) {
            data[k] = scopeInfo[k];
          });
          done(null, scopeInfo.granted, data);
        });
      }
    )
  , function askUserToAllowScope(req, res /*, next*/) {
      console.log('[render dialog]');
      var client = req.oauth2.client
        , authReq = req.oauth2.req
        , authInfo = req.oauth2.info
        , scope = authReq.scope
        , txtoken = TxTok.create()
        , data
        /*
        , head = req.user.meta.currentHousehold.headOfHousehold
        , house = req.user.meta.currentHousehold.householdInfo
        , name = head.name.split(/, /)
        */
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

      data = {
        transactionId: req.oauth2.transactionID
      /*
      , user: {
          name: name[1] + ' ' + name[0]
        , photo: head.imageData || house.imageData || '/images/photo.jpg'
        }
      */
      , scope: scope
      /*, permissions: authInfo.newScope && db.permissions.stringify(authInfo.newScope)*/
      , client: {
          // careful to not reveal private key
          name: req.oauth2.client && req.oauth2.client.name
        , id: req.oauth2.client && req.oauth2.client.id
        }
      , url: req.url // where to post to (and granualarly accept scope)
      , body: req.body
      };

      Object.keys(data).forEach(function (k) {
        authInfo[k] = data[k];
      });

      TxTok.put(txtoken, authInfo);

      // TODO update browser client to use html5 url state and pass this through to index.html
      // req.url = '/' // browser should handle /oauth/dialog/authorize

      res.redirect('/#/authorize/' + txtoken);
      //res.render('dialog', data);
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
      // Allow / Deny
      // Currently scope is all or nothing based on the truthiness of req.body.cancel
      // see oauth2orize/lib/middleware/decision.js
      //
      // We should be able to do the calculations here and pass back the app the list of accepted permissions
      // However, it's probably best that the app simply reask for permissions whenever it needs to escalate
      req.oauth2.info.body = req.body;

      // TODO pick apart which scopes were granted and
      // create req.oauth2.res.grantedScope
      // according to req.oauth2.res.newScope and req.body

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
