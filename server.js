'use strict';

var connect = require('connect')
  , path = require('path')
  , app = connect()
  , config = require('./config')
  , Passport = require('passport').Passport
  ;

function init(Db) {
  // TODO maybe a main DB for core (Accounts) and separate DBs for the modules?

  var serveStatic = require('serve-static')
    , urlrouter = require('connect_router')
    //, ws = require('./lib/ws')
    //, wsport = config.wsport || 8282
    , sessionLogic
    , oauth2Logic
    , ru = config.rootUser
    , Auth = require('./lib/auth-logic').create(Db, config)
    , passport
    ;

  config.apiPrefix = config.apiPrefix || '/api';

  require('./lib/fixtures/root-user').create(ru, Auth);

  app.api = function (path, fn) {
    if (!fn) {
      fn = path;
      path = "";
    }

    app.use(config.apiPrefix + path, fn);
    return app;
  };

  app
    //.use(require('morgan')())
    .use(require('errorhandler')({ dumpExceptions: true, showStack: true }))
    .use(require('./lib/connect-shims/query')())
    .use(require('body-parser').json({
      strict: true // only objects and arrays
    , inflate: true
    , limit: 100 * 1024
    , reviver: undefined
    , type: 'json'
    , verify: undefined
    }))
    .use(require('body-parser').urlencoded({
      extended: true
    , inflate: true
    , limit: 100 * 1024
    , type: 'urlencoded'
    , verify: undefined
    }))
    .use(require('compression')())
    .use(require('./lib/connect-shims/redirect'))
    .use(require('connect-send-error').error())
    .use(require('connect-send-json').json())
    ;

  if (config.snakeApi) {
    app.use(require('./lib/connect-shims/snake')([config.apiPrefix]));
  }

  app
    .use(require('./lib/connect-shims/xend'))
    .use(urlrouter(require('./lib/vidurls').route))
    .use(require('connect-jade')({ root: __dirname + "/views", debug: true }))
    .use(require('cookie-parser')())
    .use(require('express-session')({
      secret: config.sessionSecret
    , saveUninitialized: true // see https://github.com/expressjs/session
    , resave: true // see https://github.com/expressjs/session
    }))
    //.use(express.router)
    ;
    //route(app);

  app
    .use(config.oauthPrefix, function (req, res, next) {
        req.skipAuthn = true;
        next();
      })
    /*
    .use(config.sessionPrefix, function (req, res, next) {
        req.skipAuthn = true;
        next();
      })
    */
    ;

  //
  // Generic Template Auth
  //
  passport = new Passport();
  oauth2Logic = require('./lib/provide-oauth2').create(app, passport, config, Db, Auth);
  sessionLogic = require('./lib/sessionlogic').init(app, passport, config, Auth);

  // initialize after all passport.use, but before any passport.authorize
  app
    .use(passport.initialize())
    .use(passport.session())
    ;

  app.use(urlrouter(oauth2Logic.route));

  app.use(function (req, res, next) {
    if (/api/.test(req.url)) {
      console.log("[server] req.isAuthenticated");
      console.log(req.isAuthenticated());
      console.log(!!req.user);
    }
    next();
  });

  app.use(urlrouter(sessionLogic.route));

  // 
  // Generic App Routes
  //
  // TODO a way to specify that a database should be attached to /me
  app
    .api(urlrouter(require('./lib/session').create().route))
    .api(urlrouter(require('./lib/accounts').create(app, config, Db, Auth).route))
    .api(urlrouter(require('./lib/logins').create(app, config, Db, Auth, sessionLogic.manualLogin).route))
    .api(urlrouter(require('./lib/me').create(app, config, Db, Auth).route))
    .api(urlrouter(require('./lib/account/contacts')
      .create(app, config, Db).route
    ))
    .api(urlrouter(require('./lib/account-creditcards')
      .create(app, config, Auth, sessionLogic.manualLogin).route
    ))
    .api(urlrouter(require('./lib/account-devices').create(app, config).route))
    .api(urlrouter(require('./lib/public-contact').create(app, { mailer: config.mailer }).route))
    .api(urlrouter(require('./lib/twilio').create(app, config).route))
    ;

  //
  // Service Webhooks
  //
  app
    .use(urlrouter(require('./lib/webhooks').create(app, config).route))
    ;

  //
  // App-Specific WebSocket Server
  //
  /*
  app
    .use(urlrouter(ws.create(app, config, wsport, [])))
    ;
  */

  //
  // Generic Template API
  //
  app
    //.use(require('connect-jade')({ root: __dirname + "/views", debug: true }))
    .use(serveStatic(path.join(__dirname, 'priv', 'public')))
    .use(serveStatic(path.join(__dirname, 'dist')))
    .use(serveStatic(path.join(__dirname, 'app')))
    ;
}

module.exports = app;
module.exports.create = function () {
  config.knexInst = require('./lib/knex-connector').create(config.knex);
  require('./lib/bookshelf-models').create(config.knexInst).then(init);
};
module.exports.create();
