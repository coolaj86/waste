'use strict';

var connect = require('connect')
  , path = require('path')
  , app = connect()
  , auth = require('./auth')
  , config = require('./config')
  , ws = require('./lib/ws')
  , wsport = process.argv[3] || 8080
  , routes
  ;

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

  rest.get('/api/session', function (req, res) {
    res.send(getPublic(req.user) || { role: 'guest', as: 'get' });
  });
  // this is the fallthrough from the POST '/api' catchall
  rest.post('/api/session', function (req, res) {
    res.send(getPublic(req.user) || { role: 'guest', as: 'post' });
  });
  rest.post('/api/session/:type', function (req, res) {
    res.send(getPublic(req.user) || { role: 'guest', as: 'post', type: req.params.type });
  });
  rest.delete('/api/session', function (req, res) {
    req.logout();
    res.send({ role: 'guest', as: 'delete' });
  });
}

app
  .use(function (req, res, next) {
      res.redirect = function (code, href) {
        if (!href) {
          href = code;
          code = 302;
        }

        res.statusCode = code;
        res.setHeader('Location', href);
        res.end();
      };
      res.send = function (data) {
        if (data) {
          res.setHeader('Content-Type', 'application/json');
          data = JSON.stringify(data, null, '  ');
        } else {
          data = undefined;
        }

        res.end(data);
      };
      next();
    })
  .use(connect.query())
  .use(connect.json())
  .use(connect.urlencoded())
  .use(connect.compress())
  .use(connect.cookieParser())
  .use(connect.session({ secret: config.sessionSecret }))
  //.use(express.router)
  ;
  //route(app);

//
// Generic Template Auth
//
routes = auth.init(app, config);
routes.forEach(function (fn) {
  app.use(connect.router(fn));
});

//
// App-Specific WebSocket Server
//
app.use(connect.router(ws.create(app, wsport, [])));

//
// Generic Template API
//
app
  .use(connect.router(route))
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


function run() {
  var port = process.argv[2] || 3000
    , server
    ;

  server = app.listen(port, function () {
    console.info('Listening on http://' + server.address().address + ':' + server.address().port + '/#/');
  });
}

if (require.main === module) {
  run();
  return;
}

module.exports = app;
