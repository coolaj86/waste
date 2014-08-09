'use strict';

var Storage = require('dom-storage')
  , JsonStorage = require('json-storage').JsonStorage
  , path = require('path')
  , dbpath = path.join(__dirname, '..', 'db', 'accesstokens.json')
  , store = JsonStorage.create(new Storage(dbpath, { strict: false }), false, { stringify: false })
  ;

exports.find = function (tokenId, cb) {
  var token = store.get(tokenId)
    ;

  console.log(token);
  cb(null, token);
};

exports.save = function (tokenId, val, cb) {
  store.set(tokenId, val);
  if (cb) {
    cb(null);
  }
};

setTimeout(function () {
  // make the test auth code always available
  exports.save('09177b4c-2052-test-b672-5eda1321729e', {
    "userId": "albusdumbledore"
  , "appId": "55c7-test-bd03"
  , "scope": [
      "stake.adults:name,photo,phone,email,address::emailing,texting,calling"
    , "me:name,photo,email,phone,address:name,photo,email,phone,address:emailing,texting,calling"
    ]
  });
}, 500);
