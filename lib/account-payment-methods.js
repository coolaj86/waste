'use strict';

// NOTE stripe functions return promises:
// https://github.com/stripe/stripe-node#api-overview
module.exports.createRestless = function (_config) {
  var PromiseA = require('bluebird').Promise
    ;

  function C() {
  }

  // fuctions for "stripe" and "custom" card services
  C.paymentProcessors = {
    stripe: require('./payment-processors/stripe')
    // example logic for another card provider
  , example: require('./payment-processors/example')
  };

  // add a card to db after stripe has already added it
  C.addCard = function ($account, params, reqConfig) {
    var cardService = params.service || params.cardService || 'stripe'
      , paymentMethods = $account.get('paymentMethods') || []
      , cardcustomers = $account.get('paymentAccounts') || $account.get('cardcustomers') || []
      , paymentProcessor
      , customer
      , promise
      ;

    if (!C.paymentProcessors[cardService]) {
      throw new Error('A handler for the card service `' + cardService + '` is not defined.');
    }

    paymentProcessor = C.paymentProcessors[cardService].create(reqConfig || _config);

    if (0 === paymentMethods.length) {
      params.isPreferred = true;
    }

    // find a cardcustomer for this service type
    cardcustomers.some(function (cardcustomer) {
      if (cardcustomer.service === cardService) {
        customer = cardcustomer;
        return true;
      }
    });

    if (customer) {
      // we already have a customer
      promise = PromiseA.resolve(customer);
    } else {
      // createCustomer method of card service will add the new customer to the cardcustomers array
      // and then pass it to cardService.addCard()
      promise = paymentProcessor.createCustomer($account.toJSON()).then(
        function (processorCustomer) {
          var cardcustomers = $account.get('cardcustomers') || []
            , customer
            ;

            // and on success, add customer to cardcustomers array
            customer = {
              service: 'stripe'
            , id: processorCustomer.id
            , createdAt: new Date(processorCustomer.created * 1000).toISOString()
            };

            cardcustomers.push(customer);
            $account.set('cardcustomers', cardcustomers);
            // we resolve with the customer to pass to addCard
            return $account.save().then(function () {
              return customer;
            });
        }
      );
    }

    return promise
      .then(function (customer) {
        return paymentProcessor.addCard(customer, params.token);
      })
      .then(function (card) {
        if (0 === paymentMethods.length) {
          card.isPreferred = true;
        }

        card.createdAt = new Date().toISOString();
        // TODO this actually expires the card just a few days early
        // it could be made more accurate with moment
        card.expiresAt = new Date(card.exp_year, card.exp_month - 1, 27).toISOString();
        paymentMethods.push(card);
        $account.set('paymentMethods', paymentMethods);

        return $account.save().then(function () {
          return card;
        });
      })
      .then(function (card) {
        if (!reqConfig.authAmount) {
          return card;
        }

        return C.testCard(
          $account
        , { service: cardService, customer: customer, card: card, cardId: card.id }
        , { authAmount: params.authAmount || reqConfig.authAmount
          , captureRefundAmount: params.captureRefundAmount || reqConfig.captureRefundAmount
          , stripe: reqConfig.stripe
          }
        ).then(function () {
          return card;
        });
      })
      ;
  };

  C.testCard = function ($account, params, reqConfig) {
    var cardService = params.service || params.cardService
      , paymentProcessor
      , cardcustomers = $account.get('paymentAccounts') || $account.get('cardcustomers')
      , paymentMethods = $account.get('paymentMethods')
      , customer
      , card
      ;

    if (!C.paymentProcessors[cardService]) {
      throw new Error('A handler for the card service `' + cardService + '` is not defined.');
    }

    // find a cardcustomer for this service type
    cardcustomers.some(function (cardcustomer) {
      if (cardcustomer.service === cardService) {
        customer = cardcustomer;
        return true;
      }
    });

    paymentProcessor = C.paymentProcessors[cardService].create(reqConfig || _config);

    paymentMethods.some(function (_card) {
      if (params.cardId === _card.id || params.card.id === _card.id) {
        card = _card;
        return true;
      }
    });

    if (!card) {
      throw new Error('no card found to test against');
    }

    return paymentProcessor.testCard(
      card
    , { authAmount: params.authAmount || reqConfig.authAmount
      , captureRefundAmount: params.captureRefundAmount || reqConfig.captureRefundAmount
      }
    ).then(function (charge) {
      card.updatedAt = new Date().toISOString();
      card.authAmount = params.authAmount || reqConfig.authAmount;

      $account.set('paymentMethods', paymentMethods);
      return $account.save().then(function () {
        return charge;
      });
    });
  };

  // Update all the cards to change which one is preferred
  // returns Promise
  C.setPreferredCard = function (account, preferredCardId) {
    var paymentMethods = account.get('paymentMethods') || []
      ;

    paymentMethods.forEach(function (card) {
      card.isPreferred = (card.id === preferredCardId);
    });

    account.set('paymentMethods', paymentMethods);
    return account.save();
  };

  // remove card from customer account and tell stripe to forget the card
  // returns Promise
  C.removeCard = function ($account, cardId, reqConfig) {
    var paymentMethods = $account.get('paymentMethods') || []
      , customerId
      , cardService
      ;

    paymentMethods = paymentMethods.filter(function (card) {
      if (cardId === card.id) {
        customerId = card.card.customer;
        cardService = card.service || card.cardService;
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

    return C.paymentProcessors[cardService].create(reqConfig || _config)
      .removeCard(customerId, cardId)
      .then(
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
    var $account = req.user.account
      , data = req.body
      ;

    C.addCard($account, data, req.config)
      .then(
        function (card) {
          res.send(card);
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
