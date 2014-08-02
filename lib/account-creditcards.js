'use strict';

var createStripe = require('stripe')
  , products = require('./products')
  , Promise = require('bluebird')
  ;

module.exports.create = function (app, config, Auth) {
  var stripe = createStripe(config.stripe.secret)
    , cardServices
    ;

  // ^ks fuctions for "stripe" and "custom" card services
  // TODO: move to module?
  cardServices = {
    stripe: {
      createCustomer: function (account) {
        // run stripe.customers.create
        return new Promise(function (resolve, reject) {
          stripe.customers.create({
            description: account.get('name')
          , email: account.get('email')
          }
          , function (err, stripeCustomer) {
            var cardcustomers = account.get('cardcustomers') || []
              , customer
              ;
            if (err) {
              reject(err);
            }
            else {
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
          });
        });
      }
      , addCard: function (cardToken) {
        return function (customer) {
          // customer is passed from account or createCustomer
          return new Promise(function (resolve, reject) {
            stripe.customers.createCard(customer.id, {
              card: cardToken.id
            }
            , function (err, card) {
//console.log('stripe add card result: ' + JSON.stringify({err:err,card:card}));              
              // we resolve with the card to pass to the save process
              err ? reject(err) : resolve(card);
            });
          });
        };
      }
    },
    // example logic for another card provider
    custom: {
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
//console.log('custom addCard:' + JSON.stringify(customer));          
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
  app.use(config.apiPrefix + '/me/creditcards', attachAccount);
  app.use(config.apiPrefix + '/me/purchases', attachAccount);

  function route(rest) {
    function logErr(msg) {
      return function (err) {
        console.error(msg);
        console.error(err);
      };
    }

    function testCredit(cardP, customerOrCard) {
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

//    function createStripeCustomer(stripeToken, account) {
//      // Set your secret key: remember to change this to your live secret key in production
//      // See your keys here https://manage.stripe.com/account
//      var customerOrCard
//        , cardP
//        ;
//
//      function createCustomerWithCard() {
//        return stripe.customers.create(
//          { card: stripeToken.id
//          , description: stripeToken.email || account.get('name')
//              + ' ('
//              + stripeToken.card.processor + '-' + stripeToken.card.last4
//              + ')'
//          }
//        );
//      }
//
//      function addCardToCustomer() {
//        console.log('ccs');
//        console.log(typeof account.get('xattrs'), account.get('xattrs'));
//        console.log(typeof account.get('xattrs').creditcards[0], account.get('xattrs').creditcards[0]);
//        return stripe.customers.createCard(
//          account.get('xattrs').creditcards[0].customer
//        , { card: stripeToken.id }
//        );
//      }
//
//      console.log("account.get('xattrs')");
//      console.log(account.get('xattrs'));
//      if (!account.get('xattrs').creditcards[0]) {
//        cardP = createCustomerWithCard();
//      } else {
//        cardP = addCardToCustomer();
//      }
//
//      if (true) {
//        return testCredit(cardP, customerOrCard);
//      } else {
//        return Promise.resolve(customerOrCard);
//      }
//    }

//    function formatCustomerToCards(customerId, customer) {
//      var card
//        ;
//
//      if ('customer' === customer.object) {
//        card = customer.cards.data[0];
//      } else if ('card' === customer.object) {
//        card = customer;
//      } else {
//        console.error("bad object type: neither card nor customer");
//        return null;
//      }
//
//      // this is already on the card as card.customer
//      //card.customerId = customerId;
//      card.processor = 'stripe';
//
//      return card;
//    }

    // add a card to db after stripe has already added it
    // ^ks
    function restfulAddCard(account, cardService, cardToken) {
      var creditcards = account.get('creditcards') || []
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
      return promise
        .then(cardServices[cardService].addCard(cardToken))
        .then(function (cardToken) {
          if (0 === creditcards.length) {
            cardToken.isPreferred = true;
          }
          creditcards.push(cardToken);
          account.set('creditcards', creditcards);
          return account.save();
        })
      ;
    }

    // remove card from customer account and tell stripe to forget the card
    // returns Promise
    // ^ks
    function restfulRemoveCard(account, cardId) {
      var creditcards = account.get('creditcards') || []
        , customer
        ;

      creditcards = creditcards.filter(function (token) {
        if (cardId === token.card.id) {
          customer = token.card.customer;
          return false;
        }
        return true;
      });

      if (!customer) {
        // card not found; nothing to save or tell stripe; just continue;
        // it may be a click-happy user
        return Promise.resolve();
      }

      account.set('creditcards', creditcards);
      // resolve promise when account has saved and stripe has processed the request
      return Promise.all(
        [
          account.save()
        , stripe.customers.deleteCard(customer, cardId)
        ]
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

    // add new card to user account (after stripe already received it)
    // ^ks
    rest.post('/me/creditcards', function (req, res) {
//console.log('posted to me/creditcards:' + JSON.stringify(req.body));      
      var account = req.me
        , cardService = req.body.cardService || 'stripe'
        , cardToken = req.body
        ;

      restfulAddCard(account, cardService, cardToken)
        .done(function () {
          res.send({error:null});
        }
        , function (error) {
          res.send({error:error});
        });
    });

    // used for setting preferred card
    // ^ks
    rest.post('/me/creditcards/preferred', function (req, res) {
      restfulSetPreferredCard(req.me, req.body.id)
        .done(function () {
          res.send({error:null});
        }
        , function (error) {
          res.send({error:error});
        });
    });
    // ^ao many clients still don't support patch, so use post also

    // remove card from account
    // ^ks
    rest.delete('/me/creditcards/:cardId', function (req, res) {
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
