#!/usr/bin/env node
'use strict';

var config = require('./priv/config')
  //, PromiseA = require('bluebird').Promise
  , path = require('path')
  , forEachAsync = require('forEachAsync').forEachAsync
  , testpath
  ;

config.knex = {
  client: 'sqlite3'
//, debug: true
, connection: {
    filename : path.join(__dirname, 'priv', 'knex.dev.sqlite3')
  , debug: true
  }
};

function getFnName(fn) {
  var str = fn.toString().replace(/function\s*([^\(]*)\s*\([\s\S]*/, '$1')
    ;

  if (str) {
    return " --- " + str;
  }

  return fn.toString();
}

function init(DB) {
  var test = require(testpath).init(config, DB)
    , count = 0
    ;

  forEachAsync(test.tests, function (next, fn) {
    test.setup().then(fn).then(test.teardown).then(function () {
      count += 1;
      console.log();
      console.log('PASS', getFnName(fn).replace(/\n[\s\S]*/, ''));
      console.log();
      next();
    }).catch(function (err) {
      console.error('');
      console.error('');
      console.error('ERROR', getFnName(fn));
      console.error('');
      return test.teardown().then(function () {
        if (test.finalTeardown) {
          return test.finalTeardown().then(function () {
            throw err;
          });
        }

        throw err;
      });
    });
  }).then(function () {
    console.info('%d of %d tests complete', count, test.tests.length);
    if (test.finalTeardown) {
      return test.finalTeardown().then(function () {
        process.exit();
      });
    }

    process.exit();
  });
  /*.catch(function (err) {
    process.nextTick(function () {
      process.exit();
    });
    throw err;
  });
  */
}

module.exports.create = function (_testpath) {
  testpath = _testpath;
  config.knexInst = require('./lib/knex-connector').create(config.knex);
  require('./bookcase/bookshelf-models').create(config, config.knexInst).then(init);
};

if (require.main === module) {
  module.exports.create(process.argv[2]);
}
