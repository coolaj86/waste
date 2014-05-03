'use strict';

var http = require('http')
  , server
  ;

server = http.createServer(require('./server')).listen(3000, function () {
  console.log('Listening on http://' + server.address().address + ':' + server.address().port);
  console.log('Listening on http://127.0.0.1:' + server.address().port);
  console.log('Listening on http://local.ldsconnect.org:' + server.address().port);
});

/*
var https = require('https')
  , fs = require('fs')
  , path = require('path')
  , server
  , options
  ;

options = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'ldsconnect-key.pem')),
  ca: [
    fs.readFileSync(path.join(__dirname, 'ssl', '00-equifax.pem'))
  , fs.readFileSync(path.join(__dirname, 'ssl', '01-rapidssl.pem'))
  , fs.readFileSync(path.join(__dirname, 'ssl', '02-rapidssl.pem'))
  ],
  cert: fs.readFileSync(path.join(__dirname, 'ssl', '03-ldsconnect.pem'))
};

server = https.createServer(options, require('./server')).listen(443, function () {
  console.log('Listening on https://' + server.address().address + ':' + server.address().port);
  console.log('Listening on https://127.0.0.1:' + server.address().port);
  console.log('Listening on https://local.ldsconnect.org');
});
*/
