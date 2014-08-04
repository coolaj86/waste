'use strict';

// TODO I think tokens are intended for one-time use... so I don't know why the original example showed saving them.
var codes = {}
  //, fs = require('fs')
  //, path = require('path')
  //, dbpath = path.join(__dirname, 'authorizationcodesdb.json')
  ;

try {
  //codes = require(dbpath);
} catch(e) {
  codes = {};
}

exports.find = function(key, done) {
  var code = codes[key];
  done(null, code);
  // TODO delete code here?
};

exports.save = function(code, values, done) {
  codes[code] = values;
  //fs.writeFile(dbpath, JSON.stringify(codes, null, '  '), 'utf8', function () {
  setTimeout(function () {
    delete codes[code];
  }, 5 * 60 * 1000);
    if (done) {
      done(null);
    }
  //});
};
