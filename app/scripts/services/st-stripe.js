'use strict';

// add stripe card
// add custom card
// use st-alert to pop open custom card
// in node, allow adding either type of card

/**
 * @ngdoc service
 * @name yololiumApp.stripe
 * @description
 * # stripe
 * Service in the yololiumApp.
 */
angular.module('yololiumApp')
  .service('StStripe', ['$window', '$interval', '$q', '$http', '$modal', 'StSession', 'StApi', 'stConfig', function StStripe($window, $interval, $q, $http, $modal, StSession, StApi, stConfig) {
    var S = this
      , intervalToken
      , StripeApi
      , StripeCheckout
      , stripeGetter = $q.defer()
      , stripeReady = stripeGetter.promise
      ;

    intervalToken = $interval(function () {
      console.log('Checking for StripeApi and StripeCheckout');
      if (StripeApi && StripeCheckout) {
        $interval.cancel(intervalToken);
        window.Stripe.setPublishableKey(stConfig.stripe.publicKey);
        stripeGetter.resolve();
      }
      StripeApi = $window.Stripe;
      StripeCheckout = $window.StripeCheckout;
    }, 250, 0, false);

    S.init = function () {
    };

    function promisify(fn) {
      return function () {
        var args = Array.prototype.slice.call(arguments)
          , d = $q.defer()
          ;

        stripeReady.then(function () {
          args.unshift(d.reject.bind(d));
          args.unshift(d.resolve.bind(d));
          fn.apply(null, args);
        });
        return d.promise;
      };
    }

    // 3 steps:
    //   * Check session: sign in or create account
    //   * Check credit card: show StripeCheckout or Purchase Modal
    //   * Show thank you
    function ensurePaymentMethod(session, opts) {
      // TODO store credit / wallet
      if (session.account.xattrs.creditcards && session.account.xattrs.creditcards.length) {
        opts.paymentDue = true;
        return $q.when(opts);
      } else {
        return askForCard(opts);
      }
    }
    function ensurePurchaseConfirmation(opts) {
      // data is the response from the purchase
      // or it's the options for the purchase
      if (true === opts.paymentDue) {
        if (opts.transaction) {
          // this should be the case here
          //return showTransactionModal(opts.transaction);
          return showTransactionModal(opts);
        } else {
          return showTransactionModal(opts);
        }
      } else {
        return $q.when(opts);
      }
    }
    function ensurePurchaseTransaction(opts) {
      if (true !== opts.paymentDue) {
        return $q.when(opts);
      }

      return $http.post(
        opts.url
      , { stripeToken: null, transaction: opts.transaction }
      ).then(function (resp) {
        if (resp.data.error) {
          throw resp.data.error;
        }

        return resp.data;
      });
    }

    function askForCard(opts) {
      var d = $q.defer()
        ;

      StripeCheckout.configure({
        key: StApi.stripe.publicKey
      //, image: '/images/stripe-ish-logo.png'
      , token: function (stripeTokenObject) {
          console.log('stripeTokenObject');
          console.log(stripeTokenObject);
          $http.post(
            opts.url
          , { stripeToken: stripeTokenObject, transaction: opts.transaction }
          ).then(function (resp) {
            if (resp.data.error) {
              console.error("[ST-ERROR] something amiss during Stripe's checkout.js");
              d.reject(resp.data.error);
              return;
            }

            d.resolve(resp.data);
          }, function (err) {
            d.reject(err);
          });
        }
      }).open({
        name: StApi.stripe.storeName
      , description: opts.description
      , currency: 'USD'
      , amount: opts.amount
      , email: opts.email
      , zipCode: true
      , panelLabel: opts.panelLabel // Normally "Pay {{amount}}}"
      , allowRememberMe: true
      });

      return d.promise;
    }

    // AngularJS will instantiate a singleton by calling "new" on this function
    // TODO
    // A.account.emails[0] && A.account.emails[0].value
    // A.account.xattrs = A.account.xattrs || { creditcards: [] };
    // A.account.xattrs.creditcards[0] = A.account.xattrs.creditcards[0] || data.response;
    S.addCard = promisify(function (resolve, reject, user) {
      askForCard({
        url: StApi.apiPrefix + '/me/payment-methods'
      , email: user.email
      , description: 'Add Credit Card to Account'
      , amount: 0
      , panelLabel: 'Add Card'
      , resolve: function (data) {
          resolve(data);
          console.log('Added Stripe Credit Card', data);
        }
      , reject: function (err) {
          reject(err);
        }
      });
    });

    function showTransactionModal(opts) {
      // TODO select which funding source - card, store credit, etc

      return $modal.open({
        templateUrl: '/views/transaction.html'
      , controller: 'TransactionCtrl as T'
      , backdrop: 'static'
      , keyboard: false
      , resolve: {
          mySession: ['StSession', function (StSession) {
            return StSession.get();
          }]
        , transactionData: function () {
            return opts.transaction;
          }
        }
      }).result.then(function (confirmed) {
        if (!confirmed) {
          throw new Error("User did not approve transaction");
        }

        // TODO move to ensure transaction
        console.log(opts);
        return $http.post(opts.url , { transaction: opts.transaction }).then(function (resp) {
          console.log('[transaction]');
          console.log(resp.data);
          if (resp.data.error) {
            console.error("[ST-ERROR] something wrong durping post to '" + opts.url + "'");
            console.error(resp.data);
            console.error(opts);
            throw resp.data.error;
          }

          console.log('[transaction] purchase or subscription succeeded');
          return resp.data;
        });
        // return opts;
      });
      //return d.promise;
    }
    S.purchase = function (purchase) {
      var url = StApi.apiPrefix + '/me/purchases'
        , opts
        , session
        ;

      opts = {
        url: url
      , email: null
      , description: purchase.description
          || ('Purchase '
              + purchase.title
              + ' for '
              + '$' + (purchase.amount / 100).toFixed(2)
             )
      , panelLabel: 'Purchase for '
      , amount: purchase.amount
      , transaction: purchase
      };

      return StSession.ensureSession()
        .then(function (_session) {
          // If this asks for their card, we'll also charge it at the same time
          session = _session;
          opts.email = session.account.email;
          return ensurePaymentMethod(session, opts);
        })
          // If the user was asked for their card, they don't need to confirm here
        .then(ensurePurchaseConfirmation)
          // If the user was asked for their card, the transaction already happened
        .then(ensurePurchaseTransaction)
        /*
        .then(function (e) { return e; }, function (err) {
          console.log('error in trans', err);
          throw err;
        })
        .then(function () {
            return purchase;
          })
        */
        ;
    };

    S.subscribe = promisify(function (resolve, reject, user, subscription, card) {
      var url = StApi.apiPrefix + '/me/subscriptions'
        , opts
        ;

      opts = {
        url: url
      , email: user.email
      , description: subscription.descrption
          || ('Subscribe to '
              + subscription.desc
              + ' for '
              + '$' + (subscription.amount/100).toFixed(2)
              + '/'
              + subscription.period
              //+ subscription.period/y
              //+ subscription.plan
             )
      , amount: subscription.amount
      , panelLabel: 'Subscribe'
      , resolve: function (data) {
          resolve(data);
          console.log('Subscribed to ' + subscription.desc, data);
        }
      , reject: function (err) {
          reject(err);
        }
      , transaction: subscription
      };

      if (card) {
        if (opts.transaction) {
          //showTransactionModal(opts.transaction).then(resolve, reject);
          showTransactionModal(opts).then(resolve, reject);
        } else {
          // I think this is the case here... ?
          showTransactionModal(opts).then(resolve, reject);
        }
      } else {
        askForCard(opts);
      }
    });

    S.plans = [
      { id: 'sbiz-sms'
      , amount: '10000'
      , period: 'monthly'
      , desc: 'Email & Texting'
      }
    ];

    S.products = [
      { id: 'single-ticket'
      , amount: '1000'
      , desc: "Single Admission"
      }
    , { id: 'couples-ticket'
      , amount: '1500'
      , desc: "Admission for Two"
      }
    ];

    return S;
  }]);
