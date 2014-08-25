'use strict';

var config = require('../config')
  , path = require('path')
  , forEachAsync = require('forEachAsync').forEachAsync
  , PromiseA = require('bluebird').Promise
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
  var PaymentMethods = require('../lib/account-payment-methods').createRestless(config)
    , Auth = require('../lib/auth-logic').create(DB, config)
    , stripeTest = require('../lib/fixtures/stripe-test')
    , createStripe = require('stripe')
    , tests
    , count = 0
    , $account
    , $login
    , stripe
    ;

  function getFooAuth() {
    return { uid: 'foouser', secret: 'foosecret' };
  }

  function getFirst(el, i) { return 0 === i; }

  function getSampleCard(i) {
    var cards = []
      ;

    cards.push({
      card: {
        "number": '4242424242424242',
        "exp_month": 12,
        "exp_year": 2015,
        "cvc": '123'
      }
    });

    return cards[i];
  }

  function setup() {
    console.log('setup');
    stripe = createStripe(stripeTest.secret);
    return Auth.LocalLogin.create(getFooAuth()).then(function (_$login) {
      $login = _$login;
      console.log('$login');
      console.log(!!$login);

      if ($login.related('accounts').length) {
        return $login.related('accounts').filter(getFirst)[0];
      }

      return Auth.Accounts.create({ role: 'test'/*, email: ''*/ }).then(function (_$account) {
        console.log('[pm] linking account...');
        return Auth.Logins.linkAccounts(_$login, [_$account]).then(function () {
          console.log('[root-user] setting primary account...');
          return Auth.Logins.setPrimaryAccount(_$login, _$account).then(function () {
            console.log("[pm] created account");
            console.log("[pm] login.get('primaryAccountId')", _$login.get('primaryAccountId'));
            console.log("[pm] login.related('accounts').length", _$login.related('accounts').length);
            $account = _$account;
            console.log('$account');
            console.log(!!$account);
            return $account;
          });
        });
      });
    });
  }

  function teardown() {
    console.log('teardown');
    var _$account = $account
      , _$login = $login
      , $accounts
      , ps = []
      ;

    $accounts = $login.related('accounts');

    console.log('_$account');
    console.log(!!_$account);
    console.log('_$login');
    console.log(!!_$login);

    return $login.related('accounts').detach().then(function () {
      $accounts.forEach(function ($a) {
        ps.push($a.destroy());
      });

      ps.push($login.destroy());

      $account = null;
      $login = null;
      return PromiseA.all(ps);
    });
  }

  tests = [
    function () {
      return stripe.tokens.create(getSampleCard(0)).then(function (stripeToken) {
        console.log('stripeToken', stripeToken);
/*
        return PaymentMethods.getBids({ lotId: 'acme-lot-1' }).then(function (bidz) {
          // NOTE: this may return a bookshelf array or a JavaScript array of bookshelf objects
          console.log(JSON.stringify(bidz, null, '  '));
          //console.log(bidz);
        });
*/
        return null;
      });
    }
  ];

  forEachAsync(tests, function (next, fn) {
    setup().then(fn).then(teardown).then(function () {
      count += 1;
      next();
    }, function (err) {
      console.error('[ERROR] failure 1');
      console.error(err);
      console.error(fn.toString());

      return teardown();
    });
  }).then(function () {
    console.log('%d of %d tests complete', count, tests.length);
    process.exit();
  });
}

module.exports.create = function () {
  config.knexInst = require('../lib/knex-connector').create(config.knex);
  require('../lib/bookshelf-models').create(config, config.knexInst).then(init);
};

module.exports.create();
