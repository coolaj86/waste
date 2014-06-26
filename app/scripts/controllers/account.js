'use strict';

angular.module('yololiumApp')
  .controller('AccountCtrl', function ($scope, $state, $http, StLogin, StSession, mySession, StApi) {
    var A = this
      , stripeKey = 'pk_test_6pRNASCoBOKtIshFeQd4XMUh'
      ;

    function init(err, session) {
      A.session = null;
      A.account = null;

      if (!session || 'guest' === session.account.role) {
        // TODO make login appear
        $state.go('root');
        return;
      }

      A.providers = {};

      Object.keys(session.connected).forEach(function (type) {
        Object.keys(session.connected[type]).some(function (uid) {
          // first
          //A.providers[type] = session.connected[type][uid];
          A.providers[type] = session.connected[type][uid];
          return true;
        });
      });

      A.session = session;
      A.account = session.account;
    }

    A.addStripeCard = function () {
      var addCardHandler
        ;
        
      addCardHandler = window.StripeCheckout.configure({
        key: stripeKey
      //, image: '/images/stripe-ish-logo.png'
      , token: function (stripeTokenObject) {
          console.log('stripeTokenObject');
          console.log(stripeTokenObject);
          $http.post(
            StApi.apiPrefix + '/me/creditcards'
          , stripeTokenObject
          ).success(function (data) {
            A.account.xattrs = A.account.xattrs || { creditcards: [] };
            A.account.xattrs.creditcards[0] = A.account.xattrs.creditcards[0] || data.response;
            console.log('Added Stripe Credit Card', data);
          });
        }
      });

      addCardHandler.open({
        name: 'Angular Template App'
      , description: 'Add Credit Card to Account'
      , currency: 'USD'
      , amount: 0
      , email: A.account.emails[0] && A.account.emails[0].value
      , zipCode: true
      , panelLabel: 'Add Card' // Normally "Pay {{amount}}}"
      , allowRememberMe: true
      });
    };

    A.showLoginModal = function () {
      StLogin.showLoginModal().then(function (data) {
        console.log('hello');
        console.log(data);
        init(null, data);
      }, function (err) {
        console.error("Couldn't show login window???");
        console.error(err);
        // nada
      });
    };

    A.unlinkLogin = function (login) {
      $http.delete(StApi.apiPrefix + '/me/account/logins/' + login.id).then(function (resp) {
        StSession.update(resp.data);
        init(null, resp.data);

        console.log('resp.data');
        console.log(resp.data);
      });
    };

    function handleStripe(cb) {
      return function (code, stripeTokenObject) {
        console.log('stripeTokenObject');
        console.log(code, stripeTokenObject);
        $http.post(
          StApi.apiPrefix + '/me/creditcards'
        , stripeTokenObject
        ).success(function (data) {
          A.account.xattrs = A.account.xattrs || { creditcards: [] };
          A.account.xattrs.creditcards[0] = A.account.xattrs.creditcards[0] || data.response;
          console.log('Credit Card result', data);
          cb(data);
        });
      };
    }

    A.updateBilling = function () {
      function updated(data) {
        if (!data) {
          console.error('card info not complete');
          return;
        }

        console.log('Updated Billing');
        console.log(data);
      }

      if (A.newcard.number) {
        // TODO https://stripe.com/docs/stripe.js#createToken
        window.Stripe.card.createToken(window.$('form.stripe'), handleStripe(updated));
      } else {
        updated();
      }
    };

    A.removeCard = function (card) {
      // TODO stripe.customers.createCard(custid, { card: cardid });
      // stripe.customers.deleteCard({CUSTOMER_ID}, {CARD_ID})
      A.account.xattrs.creditcards.some(function (c, i) {
        if (c === card) {
          A.account.xattrs.creditcards.splice(i, 1);
          $http.delete(StApi.apiPrefix + '/me/creditcards/' + card.id).then(function (resp) {
            console.log('deleted');
            console.log(resp.data);
          });
          return true;
        }
      });
      A.account.xattrs.creditcards = [];
    };

    StSession.makeLogins(A, init);
    StSession.subscribe(function (session) {
      console.log('subscribing to session');
      console.log(session);
      init(null, session);
    }, $scope);
  });
