'use strict';

var connect = require('connect')
  , path = require('path')
  , app = connect()
  , auth = require('./auth')
  , config = require('./config')
  , ws = require('./lib/ws')
  , wsport = config.wsport || 8282
  , routes
  , ru = config.rootUser
    // Authn
  , Users = require('./auth/users').create({ dbfile: path.join(__dirname, 'priv', 'users.priv.json') })
    // Authz
  , Accounts = require('./auth/accounts').create({ dbfile: path.join(__dirname, 'priv', 'accounts.priv.json')})
  ;

config.apiPrefix = config.apiPrefix || '/api';

require('./auth/root-user').init(ru, Users, Accounts);

if (!connect.router) {
  connect.router = require('connect_router');
}

// Generic API routes
function route(rest) {
  function getPublic(reqUser) {
    if (!reqUser) {
      return null;
    }
    return {
      // TODO current account
      currentLoginId: reqUser.currentUser.id
    , accounts: reqUser.accounts
    , profiles: reqUser.profiles.map(function (authN) { authN.profile.pkey = authN.id; return authN.profile; })
    };
  }

  rest.get('/session', function (req, res) {
    /*
      { login: {}
      , logins: []
      , account: {}
      , accounts: []
      }
    */
    res.send(getPublic(req.user) || { role: 'guest', as: 'get' });
  });
  // this is the fallthrough from the POST '/api' catchall
  rest.post('/session', function (req, res) {
    res.send(getPublic(req.user) || { role: 'guest', as: 'post' });
  });
  // TODO have separate error / guest and valid user fallthrough
  rest.post('/session/:type', function (req, res) {
    console.log('Fell through to /api/session/:type');
    console.log('This currently happens on success and failure');
    res.send(getPublic(req.user) || { role: 'guest', as: 'post', type: req.params.type });
  });
  rest.delete('/session', function (req, res) {
    req.logout();
    res.send({ role: 'guest', as: 'delete' });
  });
}

app.api = function (path, fn) {
  if (!fn) {
    fn = path;
    path = "";
  }

  app.use(config.apiPrefix + path, fn);
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
  .use(require('./connect-shims/redirect'))
  .use(require('./connect-shims/send'))
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
routes = auth.init(app, config, Users, Accounts);
routes.forEach(function (fn) {
  // Since the API prefix is sometimes necessary,
  // it's probably better to always require the
  // auth providers to use it manually
  app.use(connect.router(fn));
});

// 
// Generic App Routes
//
app
  .api(connect.router(route))
  ;

//
// App-Specific WebSocket Server
//
app
  .use(connect.router(ws.create(app, config, wsport, [])))
  ;

//
// Generic Template API
//
app
  //.use(require('connect-jade')({ root: __dirname + "/views", debug: true }))
  .use(connect.static(path.join(__dirname, 'data')))
  //.use(connect.static(path.join(__dirname, 'dist')))
  //.use(connect.static(path.join(__dirname, '.tmp', 'concat')))
  .use(connect.static(path.join(__dirname, 'app')))
  .use(connect.static(path.join(__dirname, '.tmp')))
  .use(function (req, res, next) {
    console.info("Actual req.url:");
    console.info(req.url);
    next();
  })
  ;

module.exports = app;
