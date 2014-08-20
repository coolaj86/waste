'use strict';

var UUID = require('node-uuid')
  ;

module.exports.create = function (DB) {
  // TODO periodically remove expired codes

  function Codes() {
  }

  Codes.create = function () {
    var $code = DB.AuthCodes.forge()
      , uuid = UUID.v4()
      , code = Math.random().toString().substr(2).replace(/(\d{3})(\d{3}).*/, "$1-$2")
      , duration = 2 * 60 * 1000
      , now = Date.now()
      ;

    $code.set('uuid', uuid);
    // TODO check against hash of code instead of code itself?
    $code.set('code', code);
    $code.set('expiresAt', new Date(now + duration));

    return $code.save({}, { method: 'insert' }).then(function () {
      return $code;
    });
  };

  Codes.validate = function (uuid, code) {
    return DB.AuthCodes.forge({ uuid: uuid }).fetch().then(function ($code) {
      function fail(err, opts) {
        opts = opts || {};

        if (!$code) {
          // TODO log IP address
          throw err;
        }

        if (opts.destroy) {
          return $code.destroy().then(function () {
            throw err;
          });
        }

        attempts.unshift(new Date());
        $code.set('attempts', attempts);
        return $code.save().then(function () {
          throw err;
        }, function (err) {
          console.error('[ERROR] authcodes fail()');
          console.error(err);
        });
      }

      if (!$code) {
        return fail({ message: "the token has expired or does not exist" });
      }

      var now = Date.now()
        , attempts = $code.get('attempts') || []
        , expiresAt = $code.get('expiresAt')
        /*
        , numAttemptsTotal = $code.get('numAttemptsTotal') || 0
        , numAttemptsRecent = $code.get('numAttemptsRecent') || 0
        */
        , lastAttempt = attempts[0]
        , msPerAttempt = 1 * 1000
        , maxAttempts = 3
        ;

      if (now > expiresAt.valueOf()) {
        return fail({ message: "this token has expired" }, { destroy: true });
      }

      if (now - lastAttempt < msPerAttempt) {
        return fail({ message: "you must wait 1 second between auth code attempts" });
      }

      if (attempts.length >= maxAttempts - 1) {
        return fail({ message: "you have tried to authorize this code too many times" }, { destroy: true });
      }

      if (code !== $code.get('code')) {
        return fail({ message: "you have entered the code incorrectly. "
          + (maxAttempts - (attempts.length + 1) + " attempts remaining")
        }, { destroy: 0 === (maxAttempts - (attempts.length + 1)) });
      }

      return $code.destroy().then(function () {
        return true;
      });
    });
  };

  return Codes;
};
