'use strict';

var config = require('../config')
  , path = require('path')
  , forEachAsync = require('forEachAsync').forEachAsync
  ;

config.knex = {
  client: 'sqlite3'
//, debug: true
, connection: {
    filename : path.join(__dirname, '..', 'priv', 'knex.dev.sqlite3')
  , debug: true
  }
};

function init(DB) {
  var Codes = require('../lib/authcodes').create(DB)
    , $code
    , tests
    , testsCheckId
    , count = 0
    ;

  function setup(opts) {
    return Codes.create(opts).then(function (_$code) {
      $code = _$code;
      return $code;
    });
  }

  function teardown() {
    var _$code = $code
      ;

    $code = null;
    return _$code.destroy();
  }

  // Test that success is successful
  tests = [
    function ($code) {
      return Codes.validate($code.get('uuid'), $code.get('code')).then(function (correct) {
        if (true !== correct) {
          throw new Error('expected true to be the promised value');
        }

        return Codes.validate($code.get('uuid'), $code.get('code')).then(function () {
          throw new Error('expected the code to have been deleted');
        }, function (err) {
          if (!/not exist/.test(err.message)) {
            console.error(err);
            throw new Error('Got the wrong error');
          }
        });
      });
    }
  , function ($code) {
      return Codes.validate($code.get('uuid'), 'not-the-right-code').then(function () {
        throw new Error("should have had an error");
      }, function (err) {
        if (!/incorrect/.test(err.message)) {
          console.error(err);
          throw new Error('Got the wrong error');
        }
      });
    }
  , function () {
      return Codes.validate('not-the-right-id', 'not-the-right-code').then(function () {
        throw new Error("expected this to not work");
      }, function (err) {
        if (!/not exist/.test(err.message)) {
          console.error(err);
          throw new Error('Got the wrong error');
        }
      });
    }
  ];

  testsCheckId = [
    function ($code) {
      return Codes.validate($code.get('uuid'), $code.get('code')).then(function () {
        throw new Error('Should have had checkId error');
      }, function (err) {
        if (!/wrong account/.test(err.message)) {
          console.error(err);
          throw new Error('Got the wrong error');
        }
      }).then(function () {
        return Codes.validate($code.get('uuid'), $code.get('code'), { checkId: 'abc123' });
      });
    }
  ];

  forEachAsync(tests, function (next, fn) {
    setup().then(fn).then(teardown).then(function () {
      count += 1;
      next();
    }, function (err) {
      console.error('[ERROR] failure');
      console.error(err);
      console.error(fn.toString());
      return teardown();
    });
  }).then(function () {
    forEachAsync(testsCheckId, function (next, fn) {
      setup({ checkId: 'abc123' }).then(fn).then(teardown).then(function () {
        count += 1;
        next();
      }, function (err) {
        console.error('[ERROR] failure');
        console.error(err);
        console.error(fn.toString());
        return teardown();
      });
    }).then(function () {
      console.log('%d of %d tests complete', count, tests.length + testsCheckId.length);
      process.exit();
    });
  });
}

module.exports.create = function () {
  config.knexInst = require('../lib/knex-connector').create(config.knex);
  require('../lib/bookshelf-models').create(config, config.knexInst).then(init);
};

module.exports.create();
