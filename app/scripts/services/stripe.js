'use strict';

/**
 * @ngdoc service
 * @name yololiumApp.stripe
 * @description
 * # stripe
 * Service in the yololiumApp.
 */
angular.module('yololiumApp')
  .service('Stripe', function Stripe($window, $interval, $q, $http, $modal, StSession, StApi) {
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
      }
      StripeApi = $window.Stripe;
      StripeCheckout = $window.StripeCheckout;
      stripeGetter.resolve();
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
    function ensureSession() {
      return StSession.ensureSession();
    }
    function ensureCard() {
    }
    function ensureConfirm() {
    }
    function sayThankYou() {
    }

    function askForCard(opts) {
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
            opts.resolve(resp.data);
          }, function (err) {
            opts.reject(err);
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
    }

    // AngularJS will instantiate a singleton by calling "new" on this function
    // TODO
    // A.account.emails[0] && A.account.emails[0].value
    // A.account.xattrs = A.account.xattrs || { creditcards: [] };
    // A.account.xattrs.creditcards[0] = A.account.xattrs.creditcards[0] || data.response;
    S.addCard = promisify(function (resolve, reject, user) {
      askForCard({
        url: StApi.apiPrefix + '/me/creditcards'
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

    function showTransactionModal(data) {
      //var d = $q.defer()
      //  ;

      return $modal.open({
        templateUrl: '/views/transaction.html'
      , controller: 'TransactionCtrl as T'
      , backdrop: 'static'
      , resolve: {
          mySession: function (StSession) {
            return StSession.get();
          }
        , transactionData: data
        }
      }).result.then(function (data) {
        console.log('[transaction] purchase or subscription succeeded');
        console.log(data);
      });
      //return d.promise;
    }
    S.purchase = promisify(function (resolve, reject, user, purchase, card) {
      var url = StApi.apiPrefix + '/me/purchases'
        , opts
        ;

      opts = {
        url: url
      , email: user.email
      , description: purchase.descrption
          || ('Subscribe to '
              + purchase.desc
              + ' for '
              + '$' + (purchase.amount / 100).toFixed(2)
             )
      , panelLabel: 'Purchase ' + purchase.desc
      , amount: purchase.amount
      , resolve: function (data) {
          resolve(data);
          console.log('Purchased ' + purchase.desc, data);
        }
      , reject: function (err) {
          reject(err);
        }
      , transaction: purchase
      };


      if (card) {
        showTransactionModal(opts).then(resolve, reject);
      } else {
        askForCard(opts);
      }

      getPaymentMethod(opts).then(function (didConfirmPurchase) {
        var next
          ;

        if (didConfirmPurchase) {
          next = confirmPurchase().then(getLogin);
        } else {
          next = getLogin();
        }
        return next;
      }).then(function () {
        return completePayment();
      });
    });

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
        showTransactionModal(opts).then(resolve, reject);
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
  });