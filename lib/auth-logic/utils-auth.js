'use strict';

function createSecretHash(secret, hashtype) {
  hashtype = hashtype || 'md5';

  var crypto = require('crypto')
    , salt = crypto.randomBytes(32).toString('base64')
    , hash = crypto.createHash(hashtype)
    , shadow
    ;

  hash.update(salt);
  hash.update(secret);
  shadow = hash.digest('hex');

  return { salt: salt, secret: shadow, shadow: shadow, type: hashtype, hashtype: hashtype };
}

function testSecret(salt, secret, shadow, hashtype) {
  hashtype = hashtype || 'md5';

  var crypto = require('crypto')
    , hash = crypto.createHash(hashtype)
    ;

  hash.update(salt);
  hash.update(secret);

  return shadow === hash.digest('hex');
}
function md5sum(val) {
  return require('crypto').createHash('md5').update(val).digest('hex');
}

module.exports.createSecretHash = createSecretHash;
module.exports.createShadow = createSecretHash;
module.exports.testSecretHash = testSecret;
module.exports.testSecret = testSecret;
module.exports.testShadow = testSecret;
module.exports.md5sum = md5sum;
