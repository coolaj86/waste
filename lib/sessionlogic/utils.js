'use strict';

function createSecretHash(secret, type) {
  type = type || 'md5';

  var crypto = require('crypto')
    , salt = crypto.randomBytes(32).toString('base64')
    , hash = crypto.createHash(type)
    ;

  hash.update(salt);
  hash.update(secret);

  return { salt: salt, secret: hash.digest('hex'), type: type };
}

function testSecretHash(salt, secret, secretHash, type) {
  type = type || 'md5';

  var crypto = require('crypto')
    , hash = crypto.createHash(type)
    ;

  hash.update(salt);
  hash.update(secret);

  return secretHash === hash.digest('hex');
}

module.exports.createSecretHash = createSecretHash;
module.exports.testSecretHash = testSecretHash;
