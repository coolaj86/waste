'use strict';

var connect = require('connect')
  , fs = require('fs')
  , path = require('path')
  , app
  , server
  ;

if (!connect.router) {
  connect.router = require('connect_router');
}

app = connect();
app
  .use(connect.compress())
  .use(connect.static(path.join(__dirname, 'data')))
  //.use(connect.static(path.join(__dirname, 'dist')))
  //.use(connect.static(path.join(__dirname, '.tmp', 'concat')))
  .use(connect.static(path.join(__dirname, 'app')))
  .use(connect.static(path.join(__dirname, '.tmp')))
  ;

if (require.main === module) {
  server = app.listen(9003, function () {
    console.log('Listening on ', server.address());
  });
  return;
}

module.exports = app;
