'use strict';

var connect = require('connect')
  , path = require('path')
  , app = connect()
  , auth = require('./auth')
  , config = require('./config')
  , routes
  ;

if (!connect.router) {
  connect.router = require('connect_router');
}

function route(rest) {
  function getPublic(reqUser) {
    if (!reqUser) {
      return null;
    }
    return {
      currentLoginId: reqUser.currentUser.id
    , accounts: reqUser.accounts
    , profiles: reqUser.profiles.map(function (authN) { authN.profile.pkey = authN.id; return authN.profile; })
    };
  }

  rest.post('/api/session', function (req, res) {
    res.send(getPublic(req.user) || { role: 'guest', as: 'post' });
  });
  rest.get('/api/session', function (req, res) {
    res.send(getPublic(req.user) || { role: 'guest', as: 'get' });
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
          data = JSON.stringify(data);
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
  .use(connect.session({ secret: 'fzzysnthbeeeeaith' }))
  //.use(express.router)
  ;
  //route(app);

routes = auth.init(app, config);
routes.forEach(function (fn) {
  app.use(connect.router(fn));
});

app
  .use(connect.router(route))
  .use(connect.static(path.join(__dirname, 'data')))
  //.use(connect.static(path.join(__dirname, 'dist')))
  //.use(connect.static(path.join(__dirname, '.tmp', 'concat')))
  .use(connect.static(path.join(__dirname, 'app')))
  .use(connect.static(path.join(__dirname, '.tmp')))
  ;


function run() {
  var port = process.argv[2] || 3000
    , server
    ;

  server = app.listen(port, function () {
    console.log('Listening on http://' + server.address().address + ':' + server.address().port + '/#/');
  });
}

if (require.main === module) {
  run();
  return;
}

module.exports = app;
