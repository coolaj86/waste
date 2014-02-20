'use strict';

angular.module('sortinghatApp')
  .controller('LoginCtrl', function ($modalInstance, StLogin) {
    var $scope = this
      ;

    // Crazy window open/close hacks and mobile chrome on iOS workarounds

    //
    // LDS.org
    //
    StLogin.makeLogin($scope, 'lds', '/auth/ldsauth', function (session) {
      $modalInstance.close(session);
    });

    //
    // Facebook
    //
    StLogin.makeLogin($scope, 'fb', '/auth/facebook', function (session) {
      $modalInstance.close(session);
    });

    //
    // Twitter
    //
    StLogin.makeLogin($scope, 'tw', '/authn/twitter', function (session) {
      $modalInstance.close(session);
    });


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
