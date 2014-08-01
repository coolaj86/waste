'use strict';

function createSecretHash(secret, type) {
  type = type || 'md5';

  var crypto = require('crypto')
    , salt = crypto.randomBytes(32).toString('base64')
    , hash = crypto.createHash(type)
    ;

  hash.update(salt);
  hash.update(secret);

  return { salt: salt, secret: hash.digest('hex'), type: type, hashType: type };
}

function testSecret(salt, secret, secretHash, type) {
  type = type || 'md5';

  var crypto = require('crypto')
    , hash = crypto.createHash(type)
    ;

  hash.update(salt);
  hash.update(secret);

  return secretHash === hash.digest('hex');
}
function md5sum(val) {
  return require('crypto').createHash('md5').update(val).digest('hex');
}

module.exports.createSecretHash = createSecretHash;
module.exports.testSecretHash = testSecret;
module.exports.testSecret = testSecret;
module.exports.md5sum = md5sum;
