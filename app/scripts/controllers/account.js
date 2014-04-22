'use strict';

angular.module('sortinghatApp')
  .controller('AccountCtrl', function (StLogin, mySession) {
    var $scope = this
      ;

    if (mySession && mySession.profiles) {
      mySession.profiles.forEach(function (profile) {
        mySession[profile.provider] = true;
      });
    }
    $scope.session = mySession;

    function assignAccount(session) {
      /*
      session.profiles.some(function (login) {
        if (session.currentLoginId.replace(/^[^:]+:/, '') === login.id) {
          $scope.profile = login;
          return true;
        }
      });
      */
      $scope.profile = session;
    }

    //
    // Facebook
    //
    StLogin.makeLogin($scope, 'fb', '/auth/facebook', function (session) {
      assignAccount(session);
    });

    //
    // Twitter
    //
    StLogin.makeLogin($scope, 'tw', '/authn/twitter', function (session) {
      assignAccount(session);
    });

    //
    // Tumblr
    //
    StLogin.makeLogin($scope, 'tumblr', '/auth/tumblr', function (session) {
      assignAccount(session);
    });

    //
    // LDS.org
    //
    StLogin.makeLogin($scope, 'lds', '/auth/ldsconnect', function (session) {
      assignAccount(session);
    });

    assignAccount(mySession);
  });
