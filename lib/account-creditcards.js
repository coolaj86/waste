'use strict';

var createStripe = require('stripe')
  ;

module.exports.create = function (app, config, Auth) {
  var stripe = createStripe(config.stripe.secret)
    ;

  // TODO /me/billing
  // /me -> /accounts/:accountId
  app.use(config.apiPrefix + '/me/creditcards', function (req, res, next) {
    if (req.me) {
      next();
      return;
    }

    if ('guest' === req.user.account.role) {
      res.send({ error: { message: "Sign in to your credit cards" } });
      return;
    }

    req.me = {};
    req.me.get = function (attr) {
      if (req.user.account[attr]) {
        return req.user.account[attr];
      }

      if ('xattrs' !== attr) {
        throw new Error("'" + attr + "' not supported");
      }

      req.user.account.xattrs = req.user.account.xattrs || {};
      req.user.account.xattrs.creditcards = req.user.account.xattrs.creditcards || [];
      return req.user.account.xattrs;
    };
    req.me.set = function (attr, val) {
      req.user.account[attr] = val;
    };
    req.me.save = function () {
      Auth.Accounts.save(req.user.account);
    };

    next();
  });

  function route(rest) {
    function addStripeCustomer(stripeToken, account) {
      // Set your secret key: remember to change this to your live secret key in production
      // See your keys here https://manage.stripe.com/account
      var customerOrCard
        , cardP
        ;

      function logErr(msg) {
        return function (err) {
          console.error(msg);
          console.error(err);
        };
      }

      function createCustomerWithCard() {
        return stripe.customers.create(
          { card: stripeToken.id
          , description: account.get('email') || account.get('name')
              + ' ('
              + stripeToken.card.processor + '-' + stripeToken.card.last4
              + ')'
          }
        );
      }

      function addCardToCustomer() {
        console.log('ccs');
        console.log(typeof account.get('xattrs'), account.get('xattrs'));
        console.log(typeof account.get('xattrs').creditcards[0], account.get('xattrs').creditcards[0]);
        return stripe.customers.createCard(
          account.get('xattrs').creditcards[0].customerId
        , { card: stripeToken.id }
        );
      }

      if (!account.get('xattrs').creditcards[0]) {
        cardP = createCustomerWithCard();
      } else {
        cardP = addCardToCustomer();
      }

      function testCredit() {
        return cardP.then(
          function (_customerOrCard) {
            customerOrCard = _customerOrCard;
            console.log('customerOrCard result');
            console.log(JSON.stringify(customerOrCard, null, '  '));
            return stripe.charges.create({
              // https://support.stripe.com/questions/what-is-the-maximum-amount-i-can-charge-with-stripe
              amount: 100 // amount in cents, again
            , currency: "usd"
            , customer: customerOrCard.customer || customerOrCard.id
            , capture: false
            });
          }
        , logErr('createCustomer')
        ).then(
          function (charge) {
            console.log('charge result');
            //console.log(JSON.stringify(charge, null, '  '));
            return stripe.charges.capture(charge.id, { amount: 100 });
          }
        , logErr('authCharge')
        ).then(
          function (capture) {
            console.log('capture result');
            //console.log(JSON.stringify(capture, null, '  '));
            return stripe.charges.refund(capture.id);
          }
        , logErr('captureCharge')
        ).then(
          function (/*refund*/) {
            console.log('refund result');
            //console.log(JSON.stringify(refund, null, '  '));
            return customerOrCard;
          }
        , logErr('refundCharge')
        );
      }

      return testCredit();
    }

    function formatCustomerToCards(customerId, customer) {
      var card
        ;

      if ('customer' === customer.object) {
        card = customer.cards.data[0];
      } else if ('card' === customer.object) {
        card = customer;
      } else {
        console.error("bad object type: neither card nor customer");
        return null;
      }

      card.customerId = customerId;
      card.processor = 'stripe';

      return card;
    }

    function restfulAddCard(account, stripeToken) {
      var customer
        ;

      console.log('stripeToken');
      //console.log(JSON.stringify(req.body, null, '  '));
      return addStripeCustomer(stripeToken, account)
        .then(function (_customer) {
        var customerId = account.get('xattrs').creditcards[0] && account.get('xattrs').creditcards[0].customerId
          ;

        customer = _customer;
        console.log('### exists customer?', typeof customer);
        console.log('### is this a customer? or a card?', customer.object);
        //console.log('account.toJSON()');
        //console.log(account.toJSON());
        //account.set('xattrs', account.get('xattrs') || {});
        account.get('xattrs').creditcards[0] = formatCustomerToCards(customerId || customer.id, customer);
        // force 'changed'
        account.set('xattrs', account.get('xattrs'));
        return account/*.on('query', function(data) {
          console.log('query and bindings');
          console.log(data.sql);
          console.log(data.bindings);
        })*/.save();
      }).then(function () {
        return customer;
      });
    }

    function restfulRemoveCard(req, res) {
      var deleted
        , cardId = req.params.cardId
        , account = req.me
        , stripeCards = account.get('xattrs').creditcards //.filter(function (card) { return 'stripe' === card.processor; })
        , card
        ;

      function hasCard(_card, i, arr) {
        if (_card.id === cardId) {
          card = arr.splice(i, 1)[0];
          return true;
        }
      }

      console.log('restfulRemoveCard');
      //console.log(stripeCards);
      if (!stripeCards.some(hasCard)) {
        res.send({ error: { message: "this card doesn't exist" } });
        return;
      }

      return stripe.customers.deleteCard(
        card.customerId
      , card.id
      ).then(function (_deleted) {
        deleted = _deleted;

        account.set('xattrs', account.get('xattrs'));
        return account.save();
      }).then(function () {
        res.send({ response: deleted });
      }, function (err) {
        console.error('[ERROR] send deleted record');
        console.error(err);
        res.send({ error: err, response: card });
        return account.save();
      });
    }

    rest.post('/me/creditcards', function (req, res) {
      var account = req.me
        , body = req.body
        ;

      restfulAddCard(account, body).then(function (customer) {
        res.send({ response: customer });
      }, function (err) {
        console.log(account.get('xattrs').creditcards);
        console.error('[ERROR] send customer record');
        console.error(err);
        res.send({ error: err });
      });
    });
    //rest.post('/me/creditcards/:cardId', restfulUpdateCard);
    rest.delete('/me/creditcards/:cardId', restfulRemoveCard);
  }

  return {
    route: route
  };
};