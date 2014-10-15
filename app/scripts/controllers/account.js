'use strict';

angular.module('yololiumApp')
  .controller('AccountCtrl', ['$scope', '$state', '$http', 'StLogin', 'StSession', 'StApi', '$modal', function ($scope, $state, $http, StLogin, StSession, StApi, $modal) {
    var A = this
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

      // ensure we have array of creditcards
      if (!A.account.creditcards) {
        A.account.creditcards = [];
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
        key: StApi.stripe.publicKey
      //, image: '/images/stripe-ish-logo.png'
      , token: function (stripeTokenObject) {
          stripeTokenObject.cardService = 'stripe';
          $http.post(
            StApi.apiPrefix + '/me/payment-methods'
          , stripeTokenObject
          ).success(function (resp) {
            if (resp.error) {
              console.log(resp.error);
              window.alert('System error adding card.');
              return;
            }
            if (0 === A.account.creditcards.length) {
              stripeTokenObject.isPreferred = true;
            }
            // recase exp_year to expYear and exp_month to expMonth
            stripeTokenObject = window.Recase.create({}).camelCopy(stripeTokenObject);
            A.account.creditcards.push(stripeTokenObject);
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
      var modal = $modal.open({
        templateUrl: '/views/cc-entry.html'
      });
      modal.opened.then(function () {        
        setTimeout(function () {
          // some hackish jQuery to setup jQuery card and observe form submission
          // TODO: add CcEntry controller to bind to /views/cc-entry.html
          var $form = $('.cc-entry-form');
          $form.card({
            container: '.cc-entry-card'
          });
          $form.on('submit', function (evt) {
            evt.preventDefault();
            // grab values from form
            window.Stripe.setPublishableKey(StApi.stripe.publicKey);
            window.Stripe.card.createToken({
              number: $form.find('[name=number]').val()
            , exp_month: $.trim($form.find('[name=expiry]').val().split('/')[0])
            , exp_year: '20' + $.trim($form.find('[name=expiry]').val().split('/')[1])
            , cvc: $form.find('[name=cvc]').val()
            , name: $form.find('[name=name]').val()
            }
            ,
            function (status, token) {
              if (token.error) {
                window.alert(token.error.message);
                return;
              }
              token.cardService = 'stripe';
              $http.post(
                StApi.apiPrefix + '/me/payment-methods'
              , token
              ).success(function (resp) {
                if (resp.error) {
                  console.log(resp.error);
                  window.alert('System error adding card.');
                  return;
                }
                if (0 === A.account.creditcards.length) {
                  token.isPreferred = true;
                }              
                // recase exp_year to expYear and exp_month to expMonth
                token = window.Recase.create({}).camelCopy(token);
                A.account.creditcards.push(token);
              }).error(function () {
                window.alert('Unknown error adding card. Please try again.');
              });
              modal.close();            
            });
            
          });
          $('#AddCardCancel').on('click', function () {
            modal.close();
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
        if (card.expYear > year) {
          return;
        }
        return card.expMonth < month;
    };

    A.showLoginModal = function () {
      StLogin.showLoginModal().then(function (data) {
        console.log('hello');
        console.log(data);
        init(data);
      }, function (err) {
        console.error('Couldn\'t show login window???');
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
          StApi.apiPrefix + '/me/payment-methods'
        , stripeTokenObject
        ).success(function (data) {
          A.account.xattrs = A.account.xattrs || { creditcards: [] };
          A.account.creditcards[0] = A.account.creditcards[0] || data.response;
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
    A.removeCard = function (tokenToDelete) {
      var currentCards
        , newCards
        ;
      currentCards = A.account.creditcards;
      newCards = currentCards.filter(function (token) {
        return (token !== tokenToDelete);
      });
      if (newCards.length > 0 && tokenToDelete.isPreferred) {
        // the preferred card was deleted so set the first card to preferred
        newCards[0].isPreferred = true;
      }
      A.account.creditcards = newCards;
      $http.delete(StApi.apiPrefix + '/me/payment-methods/' + tokenToDelete.card.id)
        .error(function () {
          window.alert('Unexpected error removing card.');
          // update dom with array of original cards
          A.account.creditcards = currentCards;
        })
      ;
    };

    // change preferred status of cards and hit PATCH endpoint
    // ^ks
    A.setPreferredCard = function (tokenToPrefer) {
      $http.post(
        StApi.apiPrefix + '/me/payment-methods/' + encodeURIComponent(tokenToPrefer.card.id) + '/preferred'
      ).success(function () {
//console.log('setting preferred: ', tokenToPrefer);        
        A.account.creditcards.forEach(function (token) {
          token.isPreferred = false;
        });
        tokenToPrefer.isPreferred = true;        
      }).error(function (resp) {
        console.log(resp);
        window.alert('System error marking card as preferred.');
      });
    };
    
    A.addThisDevice = function () {
      $http.post(
        StApi.apiPrefix + '/me/devices'
      , {token: 'tok_' + (+new Date())}
      ).success(function (devices) {
        A.account.devices = devices;
      });
    };
    
    A.enablePushNotifications = function (device) {
      device.enableDeviceNotifications = !device.enableDeviceNotifications;
      $http.post(
        StApi.apiPrefix + '/me/devices'
      , device
      ).success(function (devices) {
        A.account.devices = devices;
      });
    };
    
    A.removeDevice = function (device) {
      $http.delete(
        StApi.apiPrefix + '/me/devices/' + device.token
      ).success(function (devices) {
        A.account.devices = devices;
      });
    };

    StSession.promiseLoginsInScope(A, 'loginWith', init, initReject);
    StSession.subscribe(init, $scope);

  }]);
