'use strict';

var createStripe = require('stripe')
  , caches = {}
  ;

function logErr(msg, reject) {
  return function (err) {
    console.error('ERROR: ' + msg);
    console.error('MESSAGE: ' + err);
    if (typeof reject === 'function') {
      reject(err);
    }
  };
}

module.exports.create = function (config) {
  var stripe
    ;

  stripe = caches[config.stripe.id];
  if (!stripe) {
    // https://github.com/stripe/stripe-node
    stripe = createStripe(config.stripe.secret);
    caches[config.stripe.id] = stripe;
  }

  return {
    createCustomer: function (account) {
      // run stripe.customers.create
      return new Promise(function (resolve, reject) {
        console.log('createCustomer');
        // https://stripe.com/docs/api#create_customer
        stripe.customers.create({
          description: account.get('name')
        , email: account.get('email')
        }).then(
          function (stripeCustomer) {
            var cardcustomers = account.get('cardcustomers') || []
              , customer
              ;

              // and on success, add customer to cardcustomers array
              customer = {
                cardService: 'stripe'
              , id: stripeCustomer.id
              , created: stripeCustomer.created
              };

              cardcustomers.push(customer);
              account.set('cardcustomers', cardcustomers);
              // we resolve with the customer to pass to addCard
              resolve(customer);
          }
        , logErr('createCustomer - stripe.customers.create', reject)
        );
      });
    }

  , makeTestTransaction: function (stripeToken, authAmount, captureAmount) {
      return function () {
        // https://stripe.com/docs/api#create_charge
        return stripe.charges.create(
          // https://support.stripe.com/questions/what-is-the-maximum-amount-i-can-charge-with-stripe
          // 100 = $1.00
          { amount: authAmount || 100
          , currency: "usd"
          , card: stripeToken.id
          , capture: true
          }
        ).then(
          function (charge) {
            // https://stripe.com/docs/api/node#charge_capture
            return stripe.charges.capture(charge.id, { amount: captureAmount || 100 });
          }
        , logErr('makeTestTransaction - stripe.charges.create')
        ).then(
          function (charge) {
            // https://stripe.com/docs/api#create_refund
            return stripe.charges.createRefund(charge.id);
          }
        , logErr('makeTestTransaction - stripe.charges.capture')
        ).catch(logErr('makeTestTransaction - stripe.charges.capture'))
        ;
      };
    }

  , addCard: function (cardToken) {
      var me = this
        ;

      return function (customer) {
        console.log('add card customer.id='+customer.id+'; cardToken.id='+cardToken.id);
        // customer is passed from account or createCustomer
        return stripe.customers.createCard(customer.id, {
          // cardToken.id for tokens created by stripe checkout API popup window
          // and cardToken.card for custom card screens
          card: cardToken.id || cardToken.card
        }).then(
          function () {
            return me.makeTestTransaction(cardToken);
          }
        , logErr('addCard - stripe.customers.createCard')
        ).then(
          function () {
            return cardToken;
          }
        , logErr('makeTestTransaction(cardToken)')
        )
        ;
      };
    }

  , removeCard: function (customerId, cardId) {
      // resolve promise when account has saved and stripe has processed the request
      return stripe.customers.deleteCard(customerId, cardId).then(
        function (thing) {
          return thing || null;
        }
      , logErr('removeCard - stripe.customers.deleteCard customerId=' + customerId + ' cardId=' + cardId)
      );
    }
  };
};
