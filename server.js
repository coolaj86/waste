'use strict';

var connect = require('connect')
  , path = require('path')
  , app = connect()
  , config = require('./config')
  , escapeRegexp = require('escape-string-regexp')
  , Passport = require('passport').Passport
  ;

function init(Db) {
  // TODO maybe a main DB for core (Accounts) and separate DBs for the modules?

  var session = require('./lib/sessionlogic')
    , serveStatic = require('serve-static')
    , urlrouter = require('connect_router')
    , recase = require('recase').Recase.create({ exceptions: {} })
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
    .use(function (req, res, next) {
      if (req.headers.authorization) {
        console.log(req.url);
        console.log(req.headers.authorization);
      } else if (/\/me/.test(req.url)) {
        console.log(req.url);
        console.log(req.headers);
      }

      next();
    })
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
    .use(require('connect-send-json').json())
    .use(function (req, res, next) {
      // The webhooks, oauth and such should remain untouched
      // as to be handled by the appropriate middlewares,
      // but our own api should be transformed
      // + '$' /\/api(\/|$)/
      if (!(new RegExp('^' + escapeRegexp(config.apiPrefix) + '(\\/|$)').test(req.url))) {
        next();
        return;
      }

      if ('object' === typeof req.body && !(req.body instanceof Buffer)) {
        console.log('[camel] has incoming body');
        req.body = recase.camelCopy(req.body);
      }

      res._oldJson = res.json;
      res.json = function (data, opts) {
        if ('object' === typeof data && !(data instanceof Buffer)) {
          res._oldJson(recase.snakeCopy(data), opts);
        } else {
          res._oldJson(data, opts);
        }
      };
      res.send = res.json;
      next();
      return;
    })
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
  app
    .use(passport.initialize())
    .use(passport.session())
    ;

  sessionLogic = session.init(app, passport, config, Auth);
  app.use(urlrouter(sessionLogic.route));

  oauth2Logic = require('./lib/provide-oauth2').create(app, passport, config, Db, Auth);
  app.use(urlrouter(oauth2Logic.route));

  // 
  // Generic App Routes
  //
  // TODO a way to specify that a database should be attached to /me
  app
    .api(urlrouter(require('./lib/session').create().route))
    .api(urlrouter(require('./lib/accounts').create(app, config, Auth, sessionLogic.manualLogin).route))
    .api(urlrouter(require('./lib/account/contacts')
      .create(app, config, Db).route
    ))
    .api(urlrouter(require('./lib/account-creditcards')
      .create(app, config, Auth, sessionLogic.manualLogin).route
    ))
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
    //.use(serveStatic(path.join(__dirname, 'dist')))
    //.use(serveStatic(path.join(__dirname, '.tmp', 'concat')))
    .use(serveStatic(path.join(__dirname, '.tmp')))
    .use(serveStatic(path.join(__dirname, 'app')))
    ;
}

module.exports = app;
module.exports.create = function () {
  config.knexInst = require('./lib/knex-connector').create(config.knex);
  require('./lib/bookshelf-models').create(config.knexInst).then(init);
};
module.exports.create();
