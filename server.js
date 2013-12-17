'use strict';

var connect = require('connect')
  , fs = require('fs')
  , path = require('path')
  , app = connect()
  , server
  , port = process.argv[2] || 3000
  , auth = require('./auth')
  , config = require('./config')
  ;

if (!connect.router) {
  connect.router = require('connect_router');
}

function route(rest) {
  //session.init(rest);
  rest.post('/api/session', function (req, res) {
    // TODO exchange short-lived for long-lived
    /*
    if (req.body.fb.accessToken) {
    }
    */
    res.send({ role: 'guest' });
  });
  rest.get('/api/session', function (req, res) {
    console.log('req.user', req.user);
    console.log('req.session', req.session);
    //res.json(req.session.passport.user.public);
    res.send(req.user || { role: 'guest' });
  });
  rest.delete('/api/session', function (req, res) {
    req.logout();
    res.send({ role: 'guest' });
  });
}

app
  .use(function (req, res, next) {
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
  .use(connect.compress())
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'fzzysnthbeeeeaith' }))
  //.use(express.router)
  ;
  //route(app);

auth.init(app, config).forEach(function (fn) {
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


if (require.main === module) {
  server = app.listen(port, function () {
    console.log('Listening on http://' + server.address().address + ':' + server.address().port + '/#/');
  });
  return;
}

module.exports = app;
