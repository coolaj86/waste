'use strict';

var createStripe = require('stripe')
  ;
  
// note that stripe functions return promises:
// https://github.com/stripe/stripe-node#api-overview

module.exports.create = function (app, config) {
  var stripe = createStripe(config.stripe.secret)
    , cardServices
    , Promise = require('bluebird').Promise
    ;

  // TODO /me/billing
  // /me -> /accounts/:accountId
  function attachAccount(req, res, next) {
    req.me = Array.isArray(req.user.accounts) && req.user.accounts[0] ? req.user.accounts[0] : req.user.account;
    if (!req.me) {
      res.send({ error: { message: "You have logged in, but you have not created and set a primary account." } });
      return;
    }
    next();
  }
  app.use(config.apiPrefix + '/me/payment-methods', attachAccount);

  function route(rest) {
    function logErr(msg, reject) {
      return function (err) {
        console.error('ERROR: ' + msg);
        console.error('MESSAGE: ' + err);
        if (typeof reject === 'function') {
          reject(err);
        }
      };
    }
    
    // ^ks fuctions for "stripe" and "custom" card services
    // TODO: move to module?
    cardServices = {
      stripe: {
        createCustomer: function (account) {
          // run stripe.customers.create
          return new Promise(function (resolve, reject) {
console.log('createCustomer');            
            // https://stripe.com/docs/api#create_customer
            stripe.customers.create({
              description: account.get('name')
            , email: account.get('email')
            }
            ).then(
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
        , addCard: function (cardToken) {
          return function (customer) {
console.log('add card customer.id='+customer.id+'; cardToken.id='+cardToken.id);            
            // customer is passed from account or createCustomer
            return stripe.customers.createCard(customer.id, {
              // cardToken.id for tokens created by stripe checkout API popup window
              // and cardToken.card for custom card screens
              card: cardToken.id || cardToken.card
            }
//            ).then(
//              makeTestTransaction(cardToken)
//            , logErr('addCard - stripe.customers.createCard')
            ).then(
              function () {
                return cardToken;
              }
            , logErr('makeTestTransaction(cardToken)')
            )
            ;
          };
        }
      },
      // example logic for another card provider
      example: {
        // placeholder for custom processor
        createCustomer: function (account) {
          return new Promise(function (resolve) {
            var cardcustomers = account.get('cardcustomers') || []
              , customer
              ;
            customer = {
              cardService: 'custom'
            , id: 'cus_' + (+new Date()).toString(36) + String(Math.random()).slice(2)
            , created: Math.floor(new Date() / 1000)
            };
            cardcustomers.push(customer);
            account.set('cardcustomers', cardcustomers);
            // we resolve with the customer to pass to addCard
            resolve(customer);
          });
        }
        , addCard: function (cardToken) {
          return function (customer) {          
            // customer is passed from account or createCustomer
            // but we don't need it for this custom cardservice
            // we resolve with the card to pass to the save process
            cardToken.card.id = 'card_' + (+new Date()).toString(36) + String(Math.random()).slice(2);
            cardToken.card.customer = customer.id;
            // don't actually store card number in this demo!
            delete cardToken.number;
            return cardToken;
          };
        }
      }
    };    

    function makeTestTransaction(stripeToken) {
      return function () {
          // https://stripe.com/docs/api#create_charge
          return stripe.charges.create({
            // https://support.stripe.com/questions/what-is-the-maximum-amount-i-can-charge-with-stripe
            // 100 = $1.00
            amount: 100
          , currency: "usd"
          , card: stripeToken.id
          , capture: false
          }
          ).then(
            function (charge) {
              // https://stripe.com/docs/api#create_refund
              return stripe.charges.createRefund(charge.id);
            }
          , logErr('makeTestTransaction - stripe.charges.refund')
          );
      };
    }

    // add a card to db after stripe has already added it
    // ^ks
    function restfulAddCard (account, cardToken) {      
      var cardService = cardToken.cardService || 'stripe'
        , paymentMethods = account.get('paymentMethods') || []
        , cardcustomers = account.get('cardcustomers') || []
        , customer
        , promise
        ;
      if (!cardServices[cardService]) {
        throw new Error('A handler for the card service `' + cardService + '` is not defined.');
      }
      // when adding a card with Stripe, cardToken will look like the following:
      // {
      //   "id": "tok_14I7Rh2eZvKYlo2CyCiFXD27",
      //   "livemode": false,
      //   "created": 1405813253,
      //   "used": false,
      //   "object": "token",
      //   "type": "card",
      //   "card": {
      //     "id": "card_14I7Rh2eZvKYlo2C6Aa06QJQ",
      //     "object": "card",
      //     "last4": "1111",
      //     "brand": "Visa",
      //     "funding": "unknown",
      //     "exp_month": 4,
      //     "exp_year": 2018,
      //     "fingerprint": "tiDP36QdYA6X7km8",
      //     "country": "US",
      //     "name": "user@example.com",
      //     "address_line1": null,
      //     "address_line2": null,
      //     "address_city": null,
      //     "address_state": null,
      //     "address_zip": "84101",
      //     "address_country": null,
      //     "customer": null
      //   },
      //   "email": "user@example.com"
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
      }
      else {
        // createCustomer method of card service will add the new customer to the cardcustomers array
        // and then pass it to cardService.addCard()
        promise = cardServices[cardService].createCustomer(account);
      }
//console.log('returning promise');      
      promise
        .then(cardServices[cardService].addCard(cardToken))
        .then(function (cardToken) {
          if (0 === paymentMethods.length) {
            cardToken.isPreferred = true;
          }
          paymentMethods.push(cardToken);
          account.set('paymentMethods', paymentMethods);
          return account.save();
        })
        .then(function() {
          return cardToken;
        })
      ;
      return promise;
    }

    // remove card from customer account and tell stripe to forget the card
    // returns Promise
    // ^ks
    function restfulRemoveCard(account, cardId) {
console.log('restfulRemoveCard for cardId ' + cardId);      
      var paymentMethods = account.get('paymentMethods') || []
        , customerId
        ;

      paymentMethods = paymentMethods.filter(function (token) {
        if (cardId === token.card.id) {
          customerId = token.livemode ? token.card.customer : false;
          return false;
        }
        return true;
      });

      if (!customerId) {
        // customerId not found; nothing to save or tell stripe; just continue;
        // it may be a click-happy user
        account.set('paymentMethods', paymentMethods);
        return account.save();        
      }

      // resolve promise when account has saved and stripe has processed the request
      return stripe.customers.deleteCard(customerId, cardId).then(function () {
        account.set('paymentMethods', paymentMethods);
        return account.save();
      }
      , logErr('restfulRemoveCard - stripe.customers.deleteCard customerId=' + customerId + ' cardId=' + cardId)
      );
    }

    // Update all the cards to change which one is preferred
    // returns Promise
    // ^ks
    function restfulSetPreferredCard(account, preferredCardId) {
      var paymentMethods = account.get('paymentMethods') || []
        ;
      paymentMethods.forEach(function (token) {
        token.isPreferred = (token.card.id === preferredCardId);
      });
      account.set('paymentMethods', paymentMethods);
      return account.save();
    }

    // Endpoint to get all payment methods (credit cards, etc) separate from user
    // ^ks
    rest.get('/me/payment-methods', function (req, res) {
      res.send(req.me.paymentMethods);
    });

    // add new card to user account (after stripe already received it)
    // ^ks
    rest.post('/me/payment-methods', function (req, res) {
//console.log('posted to me/payment-methods:' + JSON.stringify(req.body));      
      var account = req.me
        , cardToken = req.body
        ;

      restfulAddCard(account, cardToken)
        .done(function (cardToken) {
          res.send(cardToken);
        }
        , function (error) {
          res.send({error:error});
        });
    });

    // used for setting preferred card
    // ^ks
    rest.post('/me/payment-methods/:cardId/preferred', function (req, res) {
      restfulSetPreferredCard(req.me, req.params.cardId)
        .done(function () {
          res.send({error:null});
        }
        , function (error) {
          res.send({error:error});
        });
    });

    // remove card from account
    // ^ks
    rest.delete('/me/payment-methods/:cardId', function (req, res) {
      restfulRemoveCard(req.me, req.params.cardId)
        .done(function () {
          res.send({error:null});
        }
        , function (error) {
          res.send({error:error});
        });
    });
  }

  return {
    route: route
  };
};
