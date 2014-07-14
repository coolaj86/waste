'use strict';

var connect = require('connect')
  , path = require('path')
  , app = connect()
  , config = require('./config')
  ;

function init(Db) {
  // TODO maybe a main DB for core (Accounts) and separate DBs for the modules?

  var auth = require('./lib/sessionlogic')
    //, ws = require('./lib/ws')
    //, wsport = config.wsport || 8282
    , authstuff
    , ru = config.rootUser
      // Authn
    , Users = require('./lib/loginlogic/users').create({ dbfile: path.join(__dirname, 'priv', 'users.priv.json') })
      // Authz
    , Accounts = require('./lib/loginlogic/accounts').create({ dbfile: path.join(__dirname, 'priv', 'accounts.priv.json')})
    , Auth = require('./lib/loginlogic').create(config, Users, Accounts)
    ;

  config.apiPrefix = config.apiPrefix || '/api';

  require('./lib/sessionlogic/root-user').init(ru, Auth);

  if (!connect.router) {
    connect.router = require('connect_router');
  }

  app.api = function (path, fn) {
    if (!fn) {
      fn = path;
      path = "";
    }

    app.use(config.apiPrefix + path, fn);
    return app;
  };

  app
    //.use(connect.logger())
    .use(connect.errorHandler({ dumpExceptions: true, showStack: true }))
    .use(connect.query())
    .use(connect.json())
    .use(connect.urlencoded())
    .use(connect.compress())
    .use(connect.cookieParser())
    .use(connect.session({ secret: config.sessionSecret }))
    .use(require('./lib/connect-shims/redirect'))
    .use(require('./lib/connect-shims/send'))
    .use(require('./lib/connect-shims/xend'))
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
  authstuff = auth.init(app, config, Auth);
  authstuff.routes.forEach(function (fn) {
    // Since the API prefix is sometimes necessary,
    // it's probably better to always require the
    // auth providers to use it manually
    app.use(connect.router(fn));
  });

  // 
  // Generic App Routes
  //
  // TODO a way to specify that a database should be attached to /me
  app
    .api(connect.router(require('./lib/session').create().route))
    .api(connect.router(require('./lib/accounts').create(app, config, Auth, authstuff.manualLogin).route))
    .api(connect.router(require('./lib/account/contacts')
      .create(app, config, Db).route
    ))
    .api(connect.router(require('./lib/account-creditcards')
      .create(app, config, Auth, authstuff.manualLogin).route
    ))
    .api(connect.router(require('./lib/public-contact').create(app, { mailer: config.mailer }).route))
    ;

  //
  // Service Webhooks
  //
  app
    .use(connect.router(require('./lib/bitcrypt').create(app, config, Db).route))
    .use(connect.router(require('./lib/webhooks').create(app, config).route))
    ;

  //
  // App-Specific WebSocket Server
  //
  /*
  app
    .use(connect.router(ws.create(app, config, wsport, [])))
    ;
  */

  //
  // Generic Template API
  //
  app
    //.use(require('connect-jade')({ root: __dirname + "/views", debug: true }))
    .use(connect.static(path.join(__dirname, 'priv', 'public')))
    //.use(connect.static(path.join(__dirname, 'dist')))
    //.use(connect.static(path.join(__dirname, '.tmp', 'concat')))
    .use(connect.static(path.join(__dirname, 'app')))
    .use(connect.static(path.join(__dirname, '.tmp')))
    ;
}

module.exports = app;
module.exports.create = function () {
  config.knexInst = require('./lib/knex-connector').create(config.knex);
  require('./lib/bookshelf-models').create(config.knexInst).then(init);
};
module.exports.create();
