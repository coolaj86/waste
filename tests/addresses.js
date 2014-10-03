'use strict';

function init(config, DB) {
  var Addrs = require('../lib/account-addresses').createController(config, DB)
    , Accounts = require('../lib/accounts').createController(config, DB)
    , PromiseA = require('bluebird').Promise
    , tests
    , shared = {}
    ;

  function setup() {
    var p
      ;

    //shared.accId = '310b4365-4359-434f-9224-5421158d7502';
    if (shared.accId) {
      console.log('get account');
      p = Accounts.get(null, shared.accId);
    } else {
      p = Accounts.create(config, {});
    }

    return p.then(function ($acc) {
      return $acc.load(['addresses']).then(function () {
        shared.accId = $acc.id;
        shared.$acc = $acc;
        return $acc;
      });
    });
  }

  function teardown() {
    return PromiseA.resolve();
  }

  function finalTeardown() {
    var ps = []
      ;

    shared.$acc.related('addresses').forEach(function ($addr) {
      ps.push($addr.destroy());
    });

    return PromiseA.all(ps).then(function () {
      return shared.$acc.destroy();
    });
  }

  // TODO test that setting home sets shipping_address_id
  tests = [
    function addAddresses($account) {
      return Addrs.add(null, $account, $account.related('addresses'), {
        addressee: "John Doe"
      , streetAddress: "123 Sesame St"
      , extendedAddress: ["Claims Office", "Bldg 1 Ste B"]
      , locality: "Baywatch"
      , region: "California"
      , pastalCode: "90210"
      , countryCode: "US"
      }).then(function ($addr) {
        if (1 !== $account.related('addresses').length) {
          console.error("$account.related('addresses').length");
          console.error($account.related('addresses').length);
          throw new Error("should be exactly one address");
        }

        if ("John Doe" !== $addr.get('addressee')) {
          throw new Error("Didn't properly create address");
        }
      });
    }
  , function addBillingAddress($account) {
      return Addrs.upsertBilling(null, $account, $account.related('addresses'), {
        addressee: "Mary Jane"
      , streetAddress: "000 Nowhere Ave"
      , extendedAddress: null
      , locality: "Burlington"
      , region: "Vermont"
      , pastalCode: "05401"
      , countryCode: "US"
      , type: "home"            // should get deleted? or also applied to shipping_address_id?
      }).then(function ($addr) {
        if (2 !== $account.related('addresses').length) {
          console.error("$account.related('addresses').length");
          console.error($account.related('addresses').length);
          throw new Error("should be exactly two addresses");
        }

        if ($addr.get("type")) {
          console.error('$addr.get("type")');
          console.error($addr.get("type"));
          throw new Error("Shouldn't have a type");
        }

        if (!$account.get("billingAddressId")) {
          throw new Error("Should have a billing address id on account");
        }

        shared.addrId = $addr.id; // $addr.get('uuid');
      });
    }
  , function addShippingAddress($account) {
      console.log('[4]');
      console.log('shared.addrId');
      console.log(shared.addrId);
      return Addrs.upsertShipping(
        null
      , $account
      , $account.related('addresses')
      , {}
      , shared.addrId
      ).then(function ($addr) {
        if ("home" !== $addr.get("type")) {
          console.error('$addr.get("type")');
          console.error($addr.get("type"));
          throw new Error("Shouldn't have the type home");
        }

        if (shared.addrId !== $account.get("shippingAddressId")) {
          throw new Error("Should have a billing address id on account");
        }

        delete shared.addrId;
      });
    }
  , function updateBillingAddress() {
      return PromiseA.reject(new Error("update billing not implemented"));
    }
  , function deleteShippingAddress() {
      return PromiseA.reject(new Error("delete shipping not implemented"));
    }
  , function rejectAddress() {
      return PromiseA.reject(new Error("reject address not implemented"));
    }
  ];

  return {
    tests: tests
  , setup: setup
  , teardown: teardown
  , finalTeardown: finalTeardown
  };
}

module.exports.init = init;

if (require.main === module) {
  require('../tester').create(__filename);
}
