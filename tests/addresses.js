'use strict';

function init(config, DB) {
  var Addrs = require('../lib/account-addresses').createController(config, DB)
    , PromiseA = require('bluebird').Promise
    , tests
    ;

  function setup() {
    return new PromiseA(function (resolve) {
      resolve();
    });
  }

  function teardown() {
    return new PromiseA(function (resolve) {
      resolve();
    });
  }

  tests = [
    function addAddress() {
      return PromiseA.reject(new Error("add address not implemented"));
    }
  , function addBillingAddress() {
      return PromiseA.reject(new Error("add billing not implemented"));
    }
  , function addShippingAddress() {
      return PromiseA.reject(new Error("add shipping not implemented"));
    }
  , function updateBillingAddress() {
      return PromiseA.reject(new Error("update billing not implemented"));
    }
  , function deleteShippingAddress() {
      return PromiseA.reject(new Error("update billing not implemented"));
    }
  ];

  return {
    tests: tests
  , setup: setup
  , teardown: teardown
  };
}

module.exports.init = init;

if (require.main === module) {
  require('../tester').create(__filename);
}
