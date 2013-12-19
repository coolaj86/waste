'use strict';

angular.module('sortinghatApp')
  .controller('LoginCtrl', function ($modalInstance, StSession, mySession) {
    var $scope = this
      , login = {}
      ;

    // Crazy window open/close hacks and mobile chrome on iOS workarounds


    //
    // Facebook
    //
    function makeLogin(abbr, authUrl) {
      var uAbbr = abbr.replace(/(^.)/, function ($1) { return $1.toUpperCase(); })
        ;

      login['poll' + uAbbr + 'Login'] = function () {
        //jQuery('body').append('<p>' + 'heya' + '</p>');
        if (!window.localStorage) {
          clearInterval(login['poll' + uAbbr + 'Int']);
          // doomed!
          return;
        }

        if (localStorage.getItem(abbr + 'Status')) {
          window['complete' + uAbbr + 'Login'](localStorage.getItem(abbr + 'Status'));
        }
      };
      window['complete' + uAbbr + 'Login'] = function (url, accessToken, email, link) {
        clearInterval(login['poll' + uAbbr + 'Int']);
        localStorage.removeItem(abbr + 'Status');
        login.loginCallback();

        console.log('accessed parent function complete' + uAbbr + 'Login', accessToken, email, link);
        //jQuery('body').append('<p>' + url + '</p>');
        login.loginWindow.close();
        delete login.loginWindow;
      };
      $scope['loginWith' + uAbbr + ''] = function () {
        console.log('loginWith' + uAbbr + '');
        login.loginCallback = function () {
          console.log('loginCallback');
          StSession.read({ expire: true }).then(function (session) {
            console.log('StSession.read()', session);
            if (session.error) {
              StSession.destroy();
            }
            $modalInstance.close(session);
          });
        };
        login.loginWindow = window.open(authUrl);
        login['poll' + uAbbr + 'Int'] = setInterval(login['poll' + uAbbr + 'Login'], 300);
      };
    }
    makeLogin('fb', '/auth/facebook');

    //
    // Twitter
    //
    makeLogin('tw', '/authn/twitter');



    //
    // Modal
    //
    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.showEmail = function () {
      $scope.emailShown = true;
    };
    $scope.loginWithEmail = function () {
    };
  });
