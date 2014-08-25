'use strict';

// NOTE stripe functions return promises:
// https://github.com/stripe/stripe-node#api-overview
module.exports.createRestless = function (__config) {
  var cardServices
    , Promise = require('bluebird').Promise
    ;

  function C() {
  }

  // ^ks fuctions for "stripe" and "custom" card services
  // TODO: move to module?
  cardServices = {
    stripe: function (_config) {
      return require('./payment-processors/stripe').create(_config || __config);
    }

    // example logic for another card provider
  , example: function (_config) {
      return require('./payment-processors/example').create(_config || __config);
    }
  };

  // add a card to db after stripe has already added it
  // ^ks
  C.addCard = function ($account, cardToken, reqConfig) {
    var cardService = cardToken.cardService || 'stripe'
      , paymentMethods = $account.get('paymentMethods') || []
      , cardcustomers = $account.get('cardcustomers') || []
      , customer
      , promise
      ;

    if (!cardServices[cardService]) {
      throw new Error('A handler for the card service `' + cardService + '` is not defined.');
    }

    // when adding a card with Stripe, cardToken will look like the following:
    /*
    { "id": "tok_14I7Rh2eZvKYlo2CyCiFXD27"
    , "livemode": false
    , "created": 1405813253
    , "used": false
    , "object": "token"
    , "type": "card"
      "card": {
        "id": "card_14I7Rh2eZvKYlo2C6Aa06QJQ"
      , "object": "card"
      , "last4": "1111"
      , "brand": "Visa"
      , "funding": "unknown"
      , "exp_month": 4
      , "exp_year": 2018
      , "fingerprint": "tiDP36QdYA6X7km8"
      , "country": "US"
      , "name": "user@example.com"
      , "address_line1": null
      , "address_line2": null
      , "address_city": null
      , "address_state": null
      , "address_zip": "84101"
      , "address_country": null
      , "customer": null
      }
    , "email": "user@example.com"
    }
    */

    if (0 === paymentMethods.length) {
      cardToken.card.isPreferred = true;
    }

    // find a cardcustomer for this service type
    cardcustomers.some(function (cardcustomer) {
      if (cardcustomer.cardService === cardService) {
        customer = cardcustomer;
        return true;
      }
    });

    if (customer) {
      // we already have a customer
      promise = Promise.resolve(customer);
    } else {
      // createCustomer method of card service will add the new customer to the cardcustomers array
      // and then pass it to cardService.addCard()
      promise = cardServices[cardService](reqConfig).createCustomer($account);
    }

    //console.log('returning promise');
    promise
      .then(cardServices[cardService](reqConfig).addCard(cardToken))
      .then(function (cardToken) {
        if (0 === paymentMethods.length) {
          cardToken.isPreferred = true;
        }
        paymentMethods.push(cardToken);
        $account.set('paymentMethods', paymentMethods);
        return $account.save();
      })
      .then(function() {
        return cardToken;
      })
    ;
    return promise;
  };

  // Update all the cards to change which one is preferred
  // returns Promise
  // ^ks
  C.setPreferredCard = function (account, preferredCardId) {
    var paymentMethods = account.get('paymentMethods') || []
      ;
    paymentMethods.forEach(function (token) {
      token.isPreferred = (token.card.id === preferredCardId);
    });
    account.set('paymentMethods', paymentMethods);
    return account.save();
  };

  // remove card from customer account and tell stripe to forget the card
  // returns Promise
  // ^ks
  C.removeCard = function ($account, cardId, reqConfig) {
    console.log('restfulRemoveCard for cardId ' + cardId);

    var paymentMethods = $account.get('paymentMethods') || []
      , customerId
      , cardService
      ;

    paymentMethods = paymentMethods.filter(function (token) {
      if (cardId === token.card.id) {
        customerId = token.livemode ? token.card.customer : false;
        cardService = token.cardService;
        return false;
      }
      return true;
    });

    if (!customerId) {
      // customerId not found; nothing to save or tell stripe; just continue;
      // it may be a click-happy user
      $account.set('paymentMethods', paymentMethods);
      return $account.save();
    }

    return cardServices[cardService](reqConfig).removeCard(customerId, cardId).then(
      function () {
        $account.set('paymentMethods', paymentMethods);
        return $account.save();
      }
    );
  };

  return C;
};

module.exports.createRestful = function (config) {
  var C = module.exports.createRestless(config)
    ;

  C.restful = {};

  C.restful.removeCard = function (req, res) {
    C.removeCard(req.user.account, req.params.cardId, req.config)
      .then(
        function () {
          res.send({ success: true });
        }
      , function (error) {
          res.send({ error: { message: error } });
        }
      );
  };

  C.restful.getPaymentMethods = function (req, res) {
    res.send(req.user.account.get('paymentMethods'));
  };

  C.restful.setPreferredCard = function (req, res) {
    C.setPreferredCard(req.user.account, req.params.cardId)
      .then(
        function () {
          res.send({ success: true });
        }
      , function (error) {
          res.send({ error: { message: error } });
        }
      );
  };

  C.restful.addCard = function (req, res) {
    //console.log('posted to me/payment-methods:' + JSON.stringify(req.body));
    var $account = req.user.account
      , cardToken = req.body
      ;

    C.addCard($account, cardToken, req.config)
      .then(
        function (cardToken) {
          res.send(cardToken);
        }
      , function (error) {
          res.send({ error: { message: error } });
        }
      );
  };

  return C;
};

module.exports.create = function (app, config) {
  var C = module.exports.createRestless(config)
    , r
    ;

  // TODO /me/billing
  // /me -> /accounts/:accountId
  function attachAccount(req, res, next) {
    if (!req.user.account) {
      res.send({ error: { message: 'You have logged in, but you have not created and set a primary account.' } });
      return;
    }

    next();
  }
  app.use(config.apiPrefix + '/me/payment-methods', attachAccount);

  function route(rest) {
    r = C.restful;

    // add new card to user account (after stripe already received it)
    rest.post('/me/payment-methods', r.addCard);

    // remove card from account
    rest.delete('/me/payment-methods/:cardId', r.removeCard);

    //
    // these doesn't need config info
    //

    // Endpoint to get all payment methods (credit cards, etc) separate from user
    rest.get('/me/payment-methods', r.getPaymentMethods);

    // used for setting preferred card
    rest.post('/me/payment-methods/:cardId/preferred', r.setPreferredCard);
  }

  return {
    route: route
  };
};
