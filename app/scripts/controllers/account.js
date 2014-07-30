'use strict';

angular.module('yololiumApp')
  .controller('AccountCtrl', function ($scope, $state, $http, StLogin, StAccount, StSession, mySession, StApi, $modal) {
    var A = this
      , stripeKey = 'pk_test_6pRNASCoBOKtIshFeQd4XMUh'
      ;

    function initReject() {
      $state.go('root');
    }

    function init(session) {
      A.session = null;
      A.account = null;

      if (!session || 'guest' === session.account.role) {
        // TODO make login appear and save state in router
        initReject();
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

      // ensure we have xattrs and creditcards
      if (!A.account.xattrs) {
        A.account.xattrs = {};
      }
      if (!A.account.xattrs.creditcards) {
        A.account.xattrs.creditcards = [];
      }

    }

    // pop up Stripe's add-card dialog
    // hit rest POST endpoing on success
    // FIXME: can we prevent browser from hanging while dialog is loading?
    // test credit card numbers: 
    //   http://www.paypalobjects.com/en_US/vhelp/paypalmanager_help/credit_card_numbers.htm
    // ^ks
    A.addCardStripe = function () {
      var addCardHandler
        ;
        
      addCardHandler = window.StripeCheckout.configure({
        key: stripeKey
      //, image: '/images/stripe-ish-logo.png'
      , token: function (stripeTokenObject) {
          $http.post(
            StApi.apiPrefix + '/me/creditcards'
          , stripeTokenObject
          ).success(function () {
            A.account.xattrs.creditcards.push(stripeTokenObject.card);
          }).error(function () {
            window.alert('Unknown error adding card. Please try again.');
          });
        }
      });

      addCardHandler.open({
        // FIXME: modal name
        name: 'Angular Template App'
      , description: 'Add Credit Card to Account'
      , currency: 'USD'
      , amount: 0
      , email: A.account.email || (A.account.emails && A.account.emails[0] && A.account.emails[0].value ? A.account.emails[0].value : '')
      , zipCode: true
      , panelLabel: 'Add Card' // Normally "Pay {{amount}}}"
      , allowRememberMe: true
      });
    };

    A.addCardCustom = function () {
      console.log('addCardCustom');
      var modal = $modal.open({
        templateUrl: "/views/cc-entry.html"
      });
      modal.opened.then(function() {
        setTimeout(function() {
          $('form.cc-entry-form').card({
            container: '.cc-entry-card'
          });          
        }, 10);
      });
    };

    // return true if card has expired
    // ^ks
    A.isExpired = function (card) {      
      var date = new Date()
        , year = date.getFullYear()
        , month = date.getMonth() + 1
        ;
        if (card.exp_year > year) {
          return;
        }
        return card.exp_month < month;
    };

    A.showLoginModal = function () {
      StLogin.showLoginModal().then(function (data) {
        console.log('hello');
        console.log(data);
        init(data);
      }, function (err) {
        console.error("Couldn't show login window???");
        console.error(err);
        // nada
      });
    };

    A.unlinkLogin = function (login) {
      $http.delete(StApi.apiPrefix + '/me/account/logins/' + login.id).then(function (resp) {
        // TODO could probably just update the session in this scope
        // instead of using StSession.update to broacast
        StSession.update(resp.data);
        //init(resp.data);

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

    // hit DELETE endpoint and remove card from scope
    // on error, restore old card list to scope
    // ^ks
    A.removeCard = function (card) {
      var currentCards
        , newCards
        ;
      currentCards = A.account.xattrs.creditcards;
      newCards = currentCards.filter(function (c) {
        return (c !== card);
      });
      if (newCards.length && card.is_preferred) {
        // the preferred card was deleted so set the first card to preferred
        newCards[0].is_preferred = true;
      }
      A.account.xattrs.creditcards = newCards;
      $http.delete(StApi.apiPrefix + '/me/creditcards/' + card.id)
        .error(function () {
          window.alert('Unexpected error removing card.');
          // update dom with array of original cards
          A.account.xattrs.creditcards = currentCards;
        })
      ;
    };

    // change preferred status of cards and hit PATCH endpoint
    // ^ks
    A.setPreferredCard = function (card) {
      A.account.xattrs.creditcards.forEach(function (c) {
        c.is_preferred = false;
      });
      card.is_preferred = true;
      $http({
          method: 'PATCH'
        , url: StApi.apiPrefix + '/me/creditcards'
        , data: {preferredCardId: card.id}
      });
    };

    StSession.promiseLoginsInScope(A, 'loginWith', init, initReject);
    StSession.subscribe(init, $scope);

  });
