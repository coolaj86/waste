'use strict';

var crypto = require('crypto')
  , UrlSafeBase64 = require('urlsafe-base64')
  ;

function createSecretHash(secret, hashtype, salt) {
  hashtype = hashtype || 'md5';

  salt = salt || crypto.randomBytes(32).toString('base64');

  var hash = crypto.createHash(hashtype)
    , shadow
    ;

  hash.update(salt);
  hash.update(secret);
  shadow = hash.digest('hex');

  return { salt: salt, secret: shadow, shadow: shadow, type: hashtype, hashtype: hashtype };
}

function genSalt(len) {
  return UrlSafeBase64.encode(crypto.randomBytes(len || 32));
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

function hashsum(hashtype, val) {
  return require('crypto').createHash(hashtype).update(val).digest('hex');
}

module.exports.createSecretHash = createSecretHash;
module.exports.createShadow = createSecretHash;
module.exports.testSecretHash = testSecret;
module.exports.testSecret = testSecret;
module.exports.testShadow = testSecret;
module.exports.genSalt = genSalt;
module.exports.randomBytes = genSalt;
module.exports.md5sum = md5sum;
module.exports.hashsum = hashsum;
