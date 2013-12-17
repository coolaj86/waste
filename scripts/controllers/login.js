'use strict';

/*globals jQuery:true*/
angular.module('sortinghatApp')
  .controller('LoginCtrl', function ($modalInstance, StSession, mySession) {
    var $scope = this
      , login = {}
      ;

    // Crazy fb login hacks and mobile chrome on ios workarounds
    login.pollFbLogin = function () {
      //jQuery('body').append('<p>' + 'heya' + '</p>');
      if (!window.localStorage) {
        clearInterval(login.pollFbInt);
        // doomed!
        return;
      }

      if (localStorage.getItem('fbStatus')) {
        window.completeFbLogin(localStorage.getItem('fbStatus'));
      }
    };
    window.completeFbLogin = function (url, accessToken, email, link) {
      clearInterval(login.pollFbInt);
      localStorage.removeItem('fbStatus');
      login.loginCallback();

      console.log('accessed parent function completeFbLogin', accessToken, email, link);
      //jQuery('body').append('<p>' + url + '</p>');
      login.loginWindow.close();
      delete login.loginWindow;
    };

    $scope.loginWithFb = function () {
      console.log('loginWithFb');
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
      login.loginWindow = window.open('/auth/facebook');
      login.pollFbInt = setInterval(login.pollFbLogin, 300);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.showEmail = function () {
      $scope.emailShown = true;
    };
    $scope.loginWithEmail = function () {
    };
  });
