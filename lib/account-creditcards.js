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
        return function () {
          // run stripe.customers.create
          return new Promise(function (resolve, reject) {
            stripe.customers.create({
              description: account.get('name')
            , email: account.get('email')
            }
            , function (err, stripeCustomer) {
              var xattrs = account.get('xattrs')
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
                xattrs.cardcustomers.push(customer);
                account.set('xattrs', xattrs);
                // we resolve with the customer to pass to addCard
                resolve(customer);
              }
            });
          });
        };
      }
      , addCard: function (cardToken) {
        return function (customer) {
          // customer is passed from xattrs or createCustomer
          return new Promise(function (resolve, reject) {
            stripe.customers.createCard(customer.id, {
              card: cardToken.id
            }
            , function (err, card) {
              // we resolve with the card to pass to the save process
              err ? reject(err) : resolve(card);
            });
          });
        };
      }
    },
    custom: {
      // placeholder for custom processor
      createCustomer: function (account) {
        return function () {
          var xattrs = account.get('xattrs')
            , customer
            ;
          customer = {
            cardService: 'custom'
          , id: 'cus_' + (+new Date).toString(36)
          , created: Math.floor(new Date / 1000)
          };
          xattrs.cardcustomers.push(customer);
          account.set('xattrs', xattrs);
          // we resolve with the customer to pass to addCard
          return customer;
        };
      }
      , addCard: function (cardToken) {
        return function (customer) {          
          // customer is passed from xattrs or createCustomer
          // but we don't need it for this custom demonstration
          // we resolve with the card to pass to the save process
          cardToken.card.id = 'card_' + (+new Date).toString(36);
          return cardToken;
        };
      }
    }
  };

  // TODO /me/billing
  // /me -> /accounts/:accountId
  function attachAccount(req, res, next) {
    console.log('ensuring req.me');
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
      var xattrs;
      if ('xattrs' == attr) {
        // ensure that user xattrs is an object
        xattrs = req.user.account.xattrs || {};
        // ... and contains creditcards and purchases
        xattrs.creditcards = xattrs.creditcards || [];
        xattrs.cardcustomers = xattrs.cardcustomers || [];
        xattrs.purchases = xattrs.purchases || [];
        req.user.account.xattrs = xattrs;
        // then return xattrs
        return xattrs;        
      }

      // return account attribute if the key exists
      if (attr in req.user.account) {        
        return req.user.account[attr];
      }

      // attempting to get a key that doesn't exist: issue warning ^ks
      console.log("User Account: attribute '" + attr + "' is not supported. Returning undefined.");
      return undefined;
    };
    req.me.set = function (attr, val) {
      req.user.account[attr] = val;
    };
    req.me.save = function () {
      Auth.Accounts.save(req.user.account);
      // placeholder promise until bookshelf is implemented ^ks
      return Promise.resolve();
    };

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

    function createStripeCustomer(stripeToken, account) {
      // Set your secret key: remember to change this to your live secret key in production
      // See your keys here https://manage.stripe.com/account
      var customerOrCard
        , cardP
        ;

      function createCustomerWithCard() {
        return stripe.customers.create(
          { card: stripeToken.id
          , description: stripeToken.email || account.get('name')
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
          account.get('xattrs').creditcards[0].customer
        , { card: stripeToken.id }
        );
      }

      console.log("account.get('xattrs')");
      console.log(account.get('xattrs'));
      if (!account.get('xattrs').creditcards[0]) {
        cardP = createCustomerWithCard();
      } else {
        cardP = addCardToCustomer();
      }

      if (true) {
        return testCredit(cardP, customerOrCard);
      } else {
        return Promise.resolve(customerOrCard);
      }
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

      // this is already on the card as card.customer
      //card.customerId = customerId;
      card.processor = 'stripe';

      return card;
    }

    // add a card to db after stripe has already added it
    // ^ks
    function restfulAddCard(account, cardService, cardToken) {
      var xattrs
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
      xattrs = account.get('xattrs');
      if (0 === xattrs.creditcards.length) {
        cardToken.card.is_preferred = true;
      }
      // find a cardcustomer for this service type
      xattrs.cardcustomers.some(function (cardcustomer) {
        if (cardcustomer.cardService === cardService) {
          customer = cardcustomer;
          return true;
        }
      });
      if (customer) {
        // we already have a customer
        promise = Promise(customer);
      }
      else {
        // createCustomer method of card service will add the new customer to the xattrs.cardcustomers array
        // and then pass it to cardService.addCard()
        promise = new Promise(cardServices[cardService].createCustomer(account));
      }
      promise
        .then(cardServices[cardService].addCard(cardToken))
        .then(function (card) {
          xattrs.creditcards.push(card);
          account.set('xattrs', xattrs);
          return account.save();
        })
      ;
    }

    // remove card from customer xattrs and tell stripe to forget the card
    // returns Promise
    // ^ks
    function restfulRemoveCard(account, cardId) {
      var xattrs = account.get('xattrs')
        , customer
        ;

      // we could get the new list of cards from Angular
      // but that potentially exposes POST tampering issues ^ks
      xattrs.creditcards = xattrs.creditcards.filter(function (card) {
        if (cardId === card.id) {
          customer = card.customer;
          return false;
        }
        return true;
      });

      if (!customer) {
        // card not found; nothing to save or tell stripe; just continue;
        // it may be a click-happy user
        return Promise.resolve();
      }

      account.set('xattrs', xattrs);
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
      var xattrs = account.get('xattrs')
        ;
      xattrs.creditcards.forEach(function (card) {
        card.is_preferred = (card.id === preferredCardId);
      });
      account.set('xattrs', xattrs);
      return account.save();
    }

    // TODO fix to be config.publicApi
    rest.get('/public/store/products', function (req, res) {
      var productsArr
        ;

      productsArr = Object.keys(products)
        .map(function (k) { products[k].id = k; return products[k]; });

      res.send(productsArr);
    });
    rest.post('/me/purchases', function (req, res) {
      console.log('/me/purchases req.me');
      console.log(req.me);
      var account = req.me
        , stripeToken = req.body.stripeToken
        , purchase = req.body.transaction || req.body.purchase
        , product
        ;

      product = purchase && products[purchase.id];
      if (!product) {
        res.send({ error: { message: "nothing to purchase" } });
        return;
      }

      product = JSON.parse(JSON.stringify(product));
      if (!product.amount) {
        product.amount = purchase.amount;
      }

      function addProductToUser() {
        console.log('[addProductToUser] 0');
        // TODO more transaction details - coupon, discount, quantity, etc
        console.log(1, account.get('xattrs'));
        console.log(2, account.get('xattrs').purchases);
        console.log(3, product.toJSON && product.toJSON());
        console.log(3, product);
        console.log(4, purchase);
        purchase.date = Date.now();
        account.get('xattrs').purchases.push({ product: product.toJSON && product.toJSON(), transaction: purchase });
        console.log('[addProductToUser] 1');
        account.save();
        console.log('[addProductToUser] 2');
        res.send(product.toJSON && product.toJSON() || product);
        console.log('[addProductToUser] 3');
      }

      function makePurchase() {
        console.log('[make-purchase] 00');
        if (!product.amount) {
          // It's FREE!
          addProductToUser();
          return;
        }

        var card
          ;

        account.get('xattrs').creditcards.some(function (_card) {
          if (account.get('xattrs').primaryFundingSource === _card.id) {
            card = _card;
            return true;
          }
        });
        card = card || account.get('xattrs').creditcards[0];

        if (!card) {
          res.send({ error: { message: "no payment method" } });
          return;
        }
        account.get('xattrs').primaryFundingSource = card.id;

        console.log('[stripe.charges.create]');
        stripe.charges.create({
          // https://support.stripe.com/questions/what-is-the-maximum-amount-i-can-charge-with-stripe
          amount: product.amount // amount in cents, again
        , currency: "usd"
        , card: card.id // may specify which card, or the primary will be used
        , customer: card.customer // always specify customer
        , capture: true
        }).then(addProductToUser, function (err) {
          console.log('[err][stripe.charges.create]');
          res.send({ error: { message: "payment failed" }, details: err, card: card });
        });
      }

      if (stripeToken) {
        console.log('[has-stripe-token]');
        restfulAddCard(account, 'stripe', stripeToken).then(makePurchase, function (err) {
          console.log(account.get('xattrs').creditcards);
          console.error('[ERROR] add card, make purchase');
          console.error(err);
          res.send({ error: err });
        });
      } else {
        console.log('[make-purchase] 11');
        makePurchase();
      }
    });

    // add new card to xattr (stripe already added it)
    // ^ks
    rest.post('/me/creditcards', function (req, res) {
      var account = req.me
        , cardService = req.cardService || 'stripe'
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
    function updateCard(req, res, next) {
      if (!req.body.preferredCardId) {
        // we currently only support setting preferredCardId
        next();
      }
      restfulSetPreferredCard(req.me, req.body.preferredCardId)
        .done(function () {
          res.send({error:null});
        }
        , function (error) {
          res.send({error:error});
        });
    }
    rest.patch('/me/creditcards', updateCard);
    rest.post('/me/creditcards', updateCard);
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
