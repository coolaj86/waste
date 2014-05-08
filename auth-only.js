'use strict';

var connect = require('connect')
  , app = connect()
  ;

if (!connect.router) {
  connect.router = require('connect_router');
}

function route(rest) {
  rest.post('/api/users', function (req, res) {
  });
}

app
  .use(connect.router(route))
  ;

module.exports = app;
