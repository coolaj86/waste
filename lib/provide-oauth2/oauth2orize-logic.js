'use strict';

// You'll see some stuff like
// A-18-C
// 
// numbers are in order of operation
// A is happens after login, but before the allow process
// B is part of the allow process
// C happens when the user is logged in and already-allowed
//
// D only happens in the grant_type=client_credentials flow
// E only happens in the grant_type=password flow

/**
 * Module dependencies.
 */
var oauth2orize = require('oauth2orize')
  //, login = require('connect-ensure-login')
  , utils = require('./oauthy-dbs/utils')
  //, escapeRegExp = require('escape-string-regexp')
  , UUID = require('node-uuid')
  //, PromiseA = require('bluebird').PromiseA
  ;

module.exports.create = function (app, passport, config, DB, Auth) {
  var server
      // in-memory only
    , TxTok
    , getScopeDelta = require('./scope-utils').getScopeDelta
    ;


  function Scopes() {
  }
  Scopes.merge = require('./scope-utils').merge;
  Scopes.set = function (accountUuid, oauthclientUuid, values) {
    return DB.Scopes.forge({
      accountUuid: accountUuid
    , oauthclientUuid: oauthclientUuid
    }).fetch().then(function ($scope) {
      if ($scope) {
        return $scope.save({
          accountUuid: accountUuid
        , oauthclientUuid: oauthclientUuid
        , values: Scopes.merge($scope.get('values'), values)
        });
      }

      return DB.Scopes.forge().save({
        accountUuid: accountUuid
      , oauthclientUuid: oauthclientUuid
      , values: values
      }, { method: 'insert' });
    });
  };

  Scopes.lookup = function (accountUuid, oauthclientUuid) {
    return DB.Scopes.forge({
      accountUuid: accountUuid
    , oauthclientUuid: oauthclientUuid
    }).fetch().then(function ($scope) {
      if (!$scope) {
        return null;
      }
      return $scope.get('values');
    });
  };

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
  server.serializeClient(function ($apikey, done) {
    var apikey = $apikey.toJSON && $apikey.toJSON() || $apikey
      ;

    console.log('[A-09] [serializeClient]');

    // TODO might need to change
    done(null, apikey.id || apikey);
  });

  server.deserializeClient(function (apikeyId, done) {
    console.log('[B-15] [deserializeClient]');

    // TODO this will create, but should be replaced with a separate db
    // that does not auto-create
    Auth.AppLogin.lookup(null, apikeyId, { id: true }).then(function ($apikey) {
      if (!$apikey) {
        done(new Error("API Key not found"));
        return;
      }

      done(null, $apikey);
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
  server.grant(oauth2orize.grant.code(function ($apikey, redirectURI, user, ares, done) {
    var code = $apikey.id + ':' + utils.uid(16)
      , authInfo = ares
      , $account = user.$account
      , $login = user.$login
      , $oauthclient = $apikey.related('oauthclient')
      , grantValues
      ;


    // XXX
    // TODO grant only the accepted scope
    // XXX
    // authInfo.acceptedScopeString

    console.log('[B-21-C] [create grant code]', $apikey.id, $account.id);
    authInfo.debug_aresInGrantCode = true;
    //console.log('ares (is info?)', authInfo);
      
    if (!$account) {
      done({ error: { message: "account could not be retrieved from logged-in user. TODO pre-guarantee this" } });
      return;
    }

    grantValues = {
      apikeyId: $apikey.id
    , loginId: $login.id
    , accountUuid: $account.id
    , oauthclientUuid: $oauthclient.id
    , scope: ares.scope
    , redirectURI: redirectURI
      // TODO this is response_type=code, not grant_type=authorization_code
    , grantType: 'authorization_code'
    , ts: Date.now()
    };

    /*
    console.log('[grant] values', consumer.uid || consumer.get('uid'), user.id);
    console.log(values);
    console.log('ares.keys()');
    console.log(Object.keys(ares));
    console.log('ares');
    console.log(ares);
    console.log('grant2 token', values);
    */

    // TODO how to know which account and apikey to use?
    // maybe in ares?
    // $apikey.id
    Scopes.set($account.id, $apikey.related('oauthclient').id, authInfo.newScope);
    console.log("GRANT CODE 1", code);
    TxTok.put(code, grantValues);
    done(null, code);
  }));

  // Grant a token (implicitly) if the user has already approved the scope greater
  // than or equal to that which is being requested now
  server.grant(oauth2orize.grant.token(function ($apikey, reqUser, ares, done) {
    console.log('[0?a] [grant token] apikey', $apikey.id);
    console.log('[ares]', Object.keys(ares));

    var values
      , $account = reqUser.$account
      , $login = reqUser.$login
      , $oauthclient = $apikey.related('oauthclient')
      ;

    // XXX TODO use account associated with grant
    values = {
      accountUuid: ares.accountUuid || $account.id
    , grantType: ares.grantType || 'implicit'
    , oauthclientUuid: $oauthclient.id
    , apikeyId: $apikey.id
    , loginId: $login.id
    , scope: ares.scope
    , ares: ares
    };
    // TODO? merge with logins?
    // values.uid = values.oauthclientUuid + values.accountUuid;

    if (!$account) {
      throw new Error('no account 1');
    }

    Auth.AccessTokens.create(values).then(function ($token) {
      done(null, $token.get('token'));
    }).catch(function (err) {
      console.error("ERROR grant token, create access token");
      console.error(err);
      done(err);

      throw err;
    });
  }));

  // Exchange authorization codes for access tokens.  The callback accepts the
  // `client`, which is exchanging `code` and any `redirectURI` from the
  // authorization request for verification.  If these values are validated, the
  // application issues an access token on behalf of the user who authorized the
  // code.
  server.exchange(oauth2orize.exchange.code(function ($apikey, code, redirectURI, done) {
    // Client gets authorized before getting an exchange code
    console.log('[B-24-C] [redeem grant code]');
    console.log("GRANT CODE 2", code);

    var grantValues = TxTok.del(code)
      , $oauthclient = $apikey.related('oauthclient')
      ;

    if (!grantValues) {
      console.error('[oauth2orize-logic] grant code exchange');
      console.error(code);
      console.error($oauthclient);

      done(new Error('Invalid Grant Code'));
      return;
    }

    /*
    console.log('$oauthclient.id', $oauthclient.id);
    console.log('[redeem grant] grantValues');
    console.log(grantValues);
    */

    if ($oauthclient.id !== grantValues.oauthclientUuid) {
      console.error("[redeem grant] [bad id] oauthclient");
      console.error($oauthclient.id, grantValues.oauthclientUuid);
      console.error($oauthclient);
      return done(null, false);
    }

    // TODO something with the redirectURI
    //if (redirectURI !== authCode.redirectURI) { return done(null, false); }
      
    // TODO all of these should use realCreate
    return DB.Accounts
      .forge({ uuid: grantValues.accountUuid })
      .fetch()
      .then(function ($account) {
        if (!$account) {
          console.error('[oauth2orize-logic] no account');
          console.error();
          return null;
        }

        return Auth.AccessTokens.create({
          accounts: [$account]
        , primaryAccountId: grantValues.accountUuid
        , apikeyId: grantValues.apikeyId
        , loginId: grantValues.loginId
        , oauthclientUuid: grantValues.oauthclientUuid
        , scope: grantValues.scope
        , grantType: grantValues.grantType || 'authorization_code'
        }).then(function ($token) {
          if (!grantValues.accountUuid) {
            throw new Error('no account 2');
          }

          return $token.get('token');
        });
      }).then(function (tokenStr) {
        console.log('tokenStr', tokenStr);
        done(null, tokenStr);
      }).catch(function (err) {
        console.error("ERROR exch code");
        console.error(err);
        done(err);

        throw err;
      });
  }));

  // Exchange user id and password for access tokens.  The callback accepts the
  // `client`, which is exchanging the user's name and password from the
  // authorization request for verification. If these values are validated, the
  // application issues an access token on behalf of the user who authorized the code.
  server.exchange(oauth2orize.exchange.password(function ($apikey, username, password, scopeArr, done) {
    console.log('[E] grant_type=password]');

    var $oauthclient = $apikey.related('oauthclient')
      ;

    // Validate the user
    // This type of validation can be used in the (rare) case that users are application specific
    // Or if the application is the root application
    Auth.LocalLogin.login({
      uid: username
    , secret: password

      // might be useful in the future
    , oaouthclientUuid: $oauthclient.id
    //, $oauthclient: $client
    , apikeyId: $apikey.id
    //, $apikey: $apikey
    }).then(function ($login) {
      var values
        ;

      if(null === $login) {
        done(null, false);
        return;
      }

      // TODO
      // the app should not be able to request scope greater than
      // what has been granted through the noraml oauth flow
      // (or specially granted by an admin)
      values = {
        requestedScopeString: scopeArr.join(' ')
      , apikeyId: $apikey.id
      , oauthclientUuid: $oauthclient.id
      , loginId: $login.id
      , primaryAccountId: $login.get('primaryAccountId')
      , accounts: $login.related('accounts').map(function (a) { return a; })
      , test: $apikey.get('test') || $oauthclient.get('test')
      , insecure: $apikey.get('insecure') || $oauthclient.get('insecure')
      , grantType: 'password' // resource owner password
      };

      Auth.AccessTokens.create(values).then(function ($token) {
        // TODO how does one specify a refresh token?
        // http://rwlive.wordpress.com/2014/06/24/oauth2-resource-owner-password-flow-using-oauth2orize-express-4-and-mongojs/
        done(null, $token.get('token'));
        //done(null, accessToken, refreshToken, params);
      }).catch(function (err) {
        console.error("ERROR Exch Pass, create AccessToken");
        console.error(err);
        done(err);

        throw err;
      });
    }).error(function (err) {
      done(err);
    }).catch(function (err) {
      console.error("ERROR Exchange Password");
      console.error(err);
      done(err);

      throw err;
    });
  }));

  // Exchange the client id and password/secret for an access token.  The callback accepts the
  // `client`, which is exchanging the client's id and password/secret from the
  // authorization request for verification. If these values are validated, the
  // application issues an access token on behalf of the client who authorized the code.
  server.exchange(oauth2orize.exchange.clientCredentials(function ($apikey, scope, done) {
    console.log('[D] grant_type=client_credentials');

    // The client is actually validated in the previous middleware.
    var apikey = $apikey.toJSON && $apikey.toJSON()
      , client = apikey.oauthclient
      , values
      ;

    // TODO check that the requested scope is not above that which has been granted
    // to the application (and or this particular keypair)
    // if (grantOf(client).gte(scope) && grantOf(auth).gte(scope))

    // TODO use a JWT token rather than sheer randomness?
    values = {
      scope: scope
    , apikeyId: apikey.id
    , oauthclientUuid: client.uuid
    , accountUuid: null
    , test: apikey.test
    , insecure: apikey.insecure
    , grantType: 'client_credentials'
    };

    Auth.AccessTokens.create(values).then(function ($token) {
      // TODO how does one specify a refresh token?
      // http://rwlive.wordpress.com/2014/06/24/oauth2-resource-owner-password-flow-using-oauth2orize-express-4-and-mongojs/
      done(null, $token.get('token'));
    }).catch(function (err) {
      console.error("ERROR client creds create AccessTokens");
      console.error(err);
      done(err);

      throw err;
    });
  }));

  function route(rest) {
    var decisions
      ;

    // Traditionally all of the oauth cruft has been handled in html alone,
    // but we handle ensuring the login and the transaction via the browser app instead of
    // creating another smaller app just for the sake of oauth
    //
    // In some future version (assuming a future where there are clients that don't run JavasScript)
    // we may provide an alternate url such as /oauth/html/xyz for a more mucky user experience
    //
    rest.get(
      '/oauth/transaction/:token'
    , function (req, res) {
        var txtoken = req.params.token
          , authInfo
          ;

        if (!txtoken) {
          res.send({ error: { message: "no transaction token specified" } });
          return;
        }

        authInfo = TxTok.del(txtoken);
        if (!authInfo) {
          res.send({ error: { message: "invalid or expired transaction token" } });
          return;
        }

        req.send(authInfo.public);
      }
    );

    rest.get(
      '/oauth/scope/:token'
    , function restfulGetScopeDelta(req, res) {
        var txtoken = req.params.token
          , authInfo = TxTok.get(txtoken)
          , user = req.user
          , $account
          ;

        if (!req.user || !req.params.token || !authInfo) {
          res.error({ message: "login and resubmit your request along with your scope" });
          return;
        }

        // TODO make this part of the /api/me resource as /api/me/scope/:appid/:txtoken ???
        // and guard all access to /api/me as follows (and attach it to req.me or req.account):
        $account = user.$account;

        if (!$account) {
          res.error({ message: "you must specify oauth scope within the context of a specific account" });
          return;
        }

        /*
        if ($apikey.get('test') && !(user.guest || user.meta.guest || user.test || user.meta.test )) {
          done(new Error("'" + apikey.client.name + "' is a demo app and may only be used by demo user accounts, not real ones.\n\n\n"));
          return;
        }
        */

        // TODO use the in-memory copy?

        // XXX
        // TODO try each account
        // XXX
        return Scopes.lookup($account.id, authInfo.oauthclientUuid).then(function (grantedScope) {
          // XXX
          // TODO fix scope.granted
          // XXX

          return getScopeDelta(grantedScope, authInfo.originalScopeArr)
            .then(function (perms) {
              // [ 'newScope', 'invalids', 'rawScope', 'requestedScope', 'exists', 'reqScope', 'granted' ]
              console.log('grantedScope', grantedScope);
              console.log('getscopedelta', Object.keys(perms));

              Object.keys(perms).forEach(function (k) {
                authInfo[k] = perms[k];
              });

              authInfo.public = {
                transactionId: authInfo.transactionId
              , granted: authInfo.granted
              , exists: !!grantedScope
              , client: authInfo.client
              , requestedScopeString: authInfo.originalScopeArr.join(' ')
              , requestedScope: Object.keys(perms.reqScope).map(function (k) { return perms.reqScope[k]; })
              , grantedScopeString: null
              , grantedScope: grantedScope || null
              , deltaScopeString: null
              , deltaScope: perms.newScope.scope
              , invalids: perms.invalids
              , test: authInfo.test
              };

              res.send(authInfo.public);
            }).catch(function (err) {
              console.error("ERROR create token REST");
              console.error(err);
              res.error({ message: err && err.message || err || "scope delta failure" });

              throw err;
            });
        });
      }
    );

    //
    //
    // Controller / View Functions
    //
    //
    function checkAppIdAndUrl(apikeyId, redirectURI, originalScopeArr, type, done) {
      // Step 1
      console.log('[A-03-C] [authorize.validateUrl]', apikeyId, type);

      Auth.AppLogin.lookup(null, apikeyId).then(function ($apikey) {
        // lookup gives back a valid apikey or errors out

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

        done(null, $apikey, redirectURI);
      }).catch(function (err) {
        console.error('Auth.AppLogin error');
        console.error(err);

        done(err);
      });
    }

    function checkAuthorizationAndScope($apikey, user, originalScopeArr, done) {
      console.log('[A-06-C] [checkAuthorizationAndScope]');

      var $account = user && user.account
        , accountUuid = $account && $account.id
        , $oauthclient = $apikey.related('oauthclient')
        , authInfo
        ;

      // this becomes req.oauth.req.info
      authInfo = {
        loginId: undefined
      , accountUuid: accountUuid
      , apikeyId: $apikey.id
      , oauthclientUuid: $oauthclient.id
      , originalScopeArr: originalScopeArr
      , debug_infoInCheckAuthScope: true
      , client: {
          // NOTE: always be careful to not reveal private key here
          name: $oauthclient.get('name')
        , title: $oauthclient.get('title')
        , desc: $oauthclient.get('desc') || $oauthclient.get('description')
          // TODO is comment note-to-self that shouldn't be exposed?
        //, comment: $oauthclient.get('comment') || $oauthclient.get('comments')
        , logo: $oauthclient.get('logo')
        , test: $apikey.get('test') || $oauthclient.get('test')
        , insecure: $apikey.get('insecure') || $oauthclient.get('insecure')
        }
      //, $apikey: $apikey
      //, $oauthclient: $oauthclient
      //, user: user
      , 
      };

      if (!user) {
        // we'll handle user login and scope checking in the browser

        // authInfo => req.oauth2.info
        done(null, false, authInfo);
        return;
      }

      authInfo.loginId = user.login.id;

      // XXX TODO BUG XXX
      // this also needs to be checked when the user logs in after this step has completed
      if ($apikey.get('test') && !user.$login.get('test')) {
        done(new Error("'" + $oauthclient.get('name') + "' is a demo app and may only be used by demo user accounts, not real ones.\n\n\n"));
        return;
      }

      // XXX
      // TODO look at each account
      // refactor into separate function
      // XXX
      return Scopes.lookup($account.id, $oauthclient.id).then(function (grantedScope) {
        // XXX
        // TODO fix granted so that dialog doesn't always appear
        // XXX

        return getScopeDelta(grantedScope, originalScopeArr)
          .then(function (scopeInfo) {
            scopeInfo.debug_inScopeInfoLookup = true;

            Object.keys(scopeInfo).forEach(function (k) {
              authInfo[k] = scopeInfo[k];
            });

            // true: the scope has been accepted previously
            // false: continue in the chain to show the dialog to ask for permission
            // authInfo => req.oauth2.info
            done(null, scopeInfo.granted, authInfo);
          }).catch(function (err) {
            console.error("ERROR scope delta failure in check scope");
            console.error(err);
            done(err);

            throw err;
          });
      });
    }

    function parseDecision(req, done) {
      //
      // Allow / Deny
      // 
      console.log('[B-18] [decision]');


      var authInfo = req.oauth2.info
        ;

      //
      // IMPORTANT
      //
      // req.body.cancel will fail the process before it reaches this middleware
      // see oauth2orize/lib/middleware/decision.js

      // req.body.transactionId;
      // req.body.cancel;
      authInfo.selectedAccountId = req.body.selectedAccountId;
      authInfo.acceptedScopeString = req.body.acceptedScope;

      /*
      console.log('');
      console.log('req.oauth.info');
      console.log(JSON.stringify(req.oauth2.info, null, '  '));
      console.log('');
      console.log('');
      */

      // authInfo => ares
      done(null, authInfo);

      // TODO how to manually hook into the redirect?
      // It probably isn't necessary since I can get the accepted scope here
      // and I could just do the scope parse logic elsewhere as I can with the txtoken getter
    }

    function askUserToAllowScope(req, res /*, next*/) {
      console.log('[A-12] [render dialog]');

      /*
      req.oauth2
      { client: [Object apikey|oauthclient]
        redirectURI: 'http://beta.ysawards.org:3000/api/auth/ldsconnect/callback',
        req: { type: 'code',
               clientID: 'ysawards-6',
               redirectURI: 'http://beta.ysawards.org:3000/api/auth/ldsconnect/callback',
               scope:
                [ 'stake.adults:name,photo,phone,email::texting,emailing',
                  'stake.leadership:name,photo,phone,email::texting,emailing' ],
               state: undefined },
        user: [Object { $logins, $accounts }]
        info: [Object as set previosly in server.authorization middleware]
        transactionID: 'dzxW37I7' }
      */
      // TODO prevent replay attacks by checking state

      var authInfo = req.oauth2.info
        , txtoken = TxTok.create()
        ;

      authInfo.transactionId = req.oauth2.transactionID;

      // made available for client to retrieve via ajax
      TxTok.put(txtoken, authInfo);

      // TODO update browser client to use html5 url state (no /#/anchorthing)
      res.redirect('/#/authorize/' + txtoken);

      // NOTE: This used to be where rendering would occur
      //res.render('dialog', authInfo);
    }

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
    // authorization).  We accomplish that here by allowing the client to log the
    // user in and use a transaction token to get application and scope info
    rest.get(
      '/oauth/dialog/authorize'
      //login.ensureLoggedIn('/login.html') // this will be handled in the browser
    , server.authorization(checkAppIdAndUrl, checkAuthorizationAndScope)
    , askUserToAllowScope
    );

    // user decision endpoint
    //
    // `decision` middleware processes a user's decision to allow or deny access
    // requested by a client application.  Based on the grant type requested by the
    // client, the above grant middleware configured above will be invoked to send
    // a response.
    decisions = server.decision(parseDecision);
    rest.post(
      '/oauth/dialog/authorize/decision'
    //  login.ensureLoggedIn() // the browser app will handle this
    , decisions[0] // ??? success?
    , decisions[1] // ??? failure?
    );


    // token endpoint
    //
    // `token` middleware handles client requests to exchange authorization grants
    // for access tokens.  Based on the grant type being exchanged, the above
    // exchange middleware will be invoked to handle the request.  Clients must
    // authenticate when making requests to this endpoint.
    rest.post(
      '/oauth/token'
      // authentication is done here (must use connect_router, not urlrouter)
    , passport.authenticate(
        [ 'provider.oauth2-basic.st'
        , 'provider.oauth2-client-password.st'
        , 'provider.oauth2-resource-owner-password.st'
        ]
      , { session: false }
      )
    , server.token()
    , server.errorHandler()
    );
  }

  return route;
};
