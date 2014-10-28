'use strict';

function init(config, DB) {
  var PromiseA = require('bluebird').Promise
    , Auth = require('../lib/auth-logic').create(DB, config)
    , ContactNodes = require('../lib/contact-nodes').createController(DB, config)
    , Logins = require('../lib/logins').createRestless(config, DB, Auth, ContactNodes)
    , tests
    , secretutils = require('secret-utils')
    , newEmail = 'coolaj86+test@gmail.com'
    , checkId = secretutils.md5sum('claim-login:' + newEmail)
    , shared = {}
    ;


  // TODO
  // INSERT INTO logins(hashid) VALUES('some-login-id');
  // INSERT INTO contactnodes(id, node, type) VALUES('0a8b345ddcfc5401f578c850442f1e1b', 'coolaj86@gmail.com', 'email');
  // INSERT INTO contactnodes_logins(id, contactnode_id, login_id)
  //    VALUES('myid', '0a8b345ddcfc5401f578c850442f1e1b', 'some-login-id');
  function setup() {
    return PromiseA.resolve();
  }

  function teardown() {
    return PromiseA.resolve();
  }

  // Test that success is successful
  tests = [
    function emailExists() {
      return Logins.check('email', newEmail).then(function (thingy) {
        if (thingy) {
          return PromiseA.reject(new Error("new email should not exist in db"));
        }
      });
    }
  , function getClaimCode() {
      return DB.AuthCodes.forge({ checkId: checkId }).fetch().then(function ($code) {
        if ($code) {
          return $code.destroy();
        }

        return Logins.getClaimCode('email', newEmail).then(function ($code) {

          if ('email' !== $code.get('nodeType')) {
            return PromiseA.reject(new Error("code should have nodeType"));
          }

          if (newEmail !== $code.get('loginNode')) {
            return PromiseA.reject(new Error("code should have loginNode"));
          }

          if (!$code.get('code')) {
            return PromiseA.reject(new Error("code should have code"));
          }

          shared.code = $code.get('code');
          shared.uuid = $code.get('uuid');
        });
      });
    }
  , function failValidateClaimCodeUuid() {
      var opts = { destroyOnceUsed: true }
        ;

      return Logins.validateClaimCode('email', newEmail, 'nixy', shared.code, opts).then(function (pass) {
        if (pass) {
          return PromiseA.reject(new Error("should have failed uuid"));
        }
      }).error(function (err) {
        if (!/does not exist/.test(err.message)) {
          return PromiseA.reject(err);
        }
      });
    }
  , function failValidateClaimCodeCode() {
      var opts = { destroyOnceUsed: true }
        ;

      return Logins.validateClaimCode('email', newEmail, shared.uuid, 'nixy', opts).then(function (pass) {
        if (pass) {
          return PromiseA.reject(new Error("should have failed code"));
        }
      }).error(function (err) {
        if (!/code incorrectly/.test(err.message)) {
          return PromiseA.reject(err);
        }
      });
    }
  , function passValidateClaimCode() {
      var opts = { destroyOnceUsed: true }
        ;

      return Logins.validateClaimCode('email', newEmail, shared.uuid, shared.code, opts).then(function (pass) {
        if (!pass) {
          return PromiseA.reject(new Error("should have passed code validation"));
        }
      });
    }
  , function failCreateLogin1() {
      var contactnodes
        ;

      contactnodes = [
        { type: 'email'
        , node: newEmail
        , uuid: shared.uuid
        , code: shared.code
        }
      ];

      return Logins.create(contactnodes, 'short');
    }
  , function failCreateLogin2() {
      var contactnodes
        ;

      contactnodes = [
        { type: 'email'
        , node: newEmail
        , uuid: 'nixy'
        , code: shared.code
        }
      ];

      return Logins.create(contactnodes, 'super secret');
    }
  , function passCreateLogin() {
      var contactnodes
        ;

      contactnodes = [
        { type: 'email'
        , node: newEmail
        , uuid: shared.uuid
        , code: shared.code
        }
      ];

      return Logins.create(contactnodes, 'super secret');
    }
  , function failLogin() {
      return PromiseA.reject(new Error("not implemented"));
    }
  , function passLogin() {
      return PromiseA.reject(new Error("not implemented"));
    }
  , function destroyLogin() {
      return PromiseA.reject(new Error("not implemented"));
      /*
      return DB.LoginNodes.forge({ contactnodeId: $cn.id }).fetch().then(function ($ln) {
      });
      */
    }
  ];

  return {
    tests: tests
  , setup: setup
  , teardown: teardown
  //, finalTeardown: finalTeardown
  };
}

module.exports.init = init;

if (require.main === module) {
  require('../tester').create(__filename);
}
