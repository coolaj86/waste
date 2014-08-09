'use strict';

var createStripe = require('stripe')
  , products = require('./products')
  , Promise = require('bluebird')
  ;
  
// note that stripe functions return promises:
// https://github.com/stripe/stripe-node#api-overview

module.exports.create = function (app, config, Auth) {
  var stripe = createStripe(config.stripe.secret)
    , cardServices
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
  app.use(config.apiPrefix + '/me/purchases', attachAccount);

  function route(rest) {
    function logErr(msg, reject) {
      return function (err) {
        console.error('ERROR: ' + msg);
        console.error('MESSAGE: ' + err);
        if (typeof reject == 'function') {
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
          return new Promise(function (resolve, reject) {
            var cardcustomers = account.get('cardcustomers') || []
              , customer
              ;
            customer = {
              cardService: 'custom'
            , id: 'cus_' + (+new Date).toString(36) + String(Math.random()).slice(2)
            , created: Math.floor(new Date / 1000)
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
            cardToken.card.id = 'card_' + (+new Date).toString(36) + String(Math.random()).slice(2);
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
        , creditcards = account.get('creditcards') || []
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
      if (0 === creditcards.length) {
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
          if (0 === creditcards.length) {
            cardToken.isPreferred = true;
          }
          creditcards.push(cardToken);
          account.set('creditcards', creditcards);
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
      var creditcards = account.get('creditcards') || []
        , customerId
        ;

      creditcards = creditcards.filter(function (token) {
        if (cardId === token.card.id) {
          customerId = token.livemode ? token.card.customer : false;
          return false;
        }
        return true;
      });

      if (!customerId) {
        // customerId not found; nothing to save or tell stripe; just continue;
        // it may be a click-happy user
        account.set('creditcards', creditcards);
        return account.save();        
      }

      // resolve promise when account has saved and stripe has processed the request
      return stripe.customers.deleteCard(customerId, cardId).then(function () {
        account.set('creditcards', creditcards);
        return account.save();
      }
      , logErr('restfulRemoveCard - stripe.customers.deleteCard customerId=' + customerId + ' cardId=' + cardId)
      );
    }

    // Update all the cards to change which one is preferred
    // returns Promise
    // ^ks
    function restfulSetPreferredCard(account, preferredCardId) {
      var creditcards = account.get('creditcards') || []
        ;
      creditcards.forEach(function (token) {
        token.isPreferred = (token.card.id === preferredCardId);
      });
      account.set('creditcards', creditcards);
      return account.save();
    }

//    // TODO fix to be config.publicApi
//    rest.get('/public/store/products', function (req, res) {
//      var productsArr
//        ;
//
//      productsArr = Object.keys(products)
//        .map(function (k) { products[k].id = k; return products[k]; });
//
//      res.send(productsArr);
//    });
//    rest.post('/me/purchases', function (req, res) {
//      console.log('/me/purchases req.me');
//      console.log(req.me);
//      var account = req.me
//        , stripeToken = req.body.stripeToken
//        , purchase = req.body.transaction || req.body.purchase
//        , product
//        ;
//
//      product = purchase && products[purchase.id];
//      if (!product) {
//        res.send({ error: { message: "nothing to purchase" } });
//        return;
//      }
//
//      product = JSON.parse(JSON.stringify(product));
//      if (!product.amount) {
//        product.amount = purchase.amount;
//      }
//
//      function addProductToUser() {
//        console.log('[addProductToUser] 0');
//        // TODO more transaction details - coupon, discount, quantity, etc
//        console.log(1, account.get('xattrs'));
//        console.log(2, account.get('xattrs').purchases);
//        console.log(3, product.toJSON && product.toJSON());
//        console.log(3, product);
//        console.log(4, purchase);
//        purchase.date = Date.now();
//        account.get('xattrs').purchases.push({ product: product.toJSON && product.toJSON(), transaction: purchase });
//        console.log('[addProductToUser] 1');
//        account.save();
//        console.log('[addProductToUser] 2');
//        res.send(product.toJSON && product.toJSON() || product);
//        console.log('[addProductToUser] 3');
//      }
//
//      function makePurchase() {
//        console.log('[make-purchase] 00');
//        if (!product.amount) {
//          // It's FREE!
//          addProductToUser();
//          return;
//        }
//
//        var card
//          ;
//
//        account.get('xattrs').creditcards.some(function (_card) {
//          if (account.get('xattrs').primaryFundingSource === _card.id) {
//            card = _card;
//            return true;
//          }
//        });
//        card = card || account.get('xattrs').creditcards[0];
//
//        if (!card) {
//          res.send({ error: { message: "no payment method" } });
//          return;
//        }
//        account.get('xattrs').primaryFundingSource = card.id;
//
//        console.log('[stripe.charges.create]');
//        stripe.charges.create({
//          // https://support.stripe.com/questions/what-is-the-maximum-amount-i-can-charge-with-stripe
//          amount: product.amount // amount in cents, again
//        , currency: "usd"
//        , card: card.id // may specify which card, or the primary will be used
//        , customer: card.customer // always specify customer
//        , capture: true
//        }).then(addProductToUser, function (err) {
//          console.log('[err][stripe.charges.create]');
//          res.send({ error: { message: "payment failed" }, details: err, card: card });
//        });
//      }
//
//      if (stripeToken) {
//        console.log('[has-stripe-token]');
//        restfulAddCard(account, 'stripe', stripeToken).then(makePurchase, function (err) {
//          console.log(account.get('xattrs').creditcards);
//          console.error('[ERROR] add card, make purchase');
//          console.error(err);
//          res.send({ error: err });
//        });
//      } else {
//        console.log('[make-purchase] 11');
//        makePurchase();
//      }
//    });

    // Endpoint to get all credit cards separate from user
    // ^ks
    rest.get('/me/payment-methods', function (req, res) {
      res.send(req.me.creditcards);
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
