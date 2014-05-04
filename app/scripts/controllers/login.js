'use strict';

angular.module('sortinghatApp')
  .controller('LoginCtrl', function ($http, $modalInstance, StLogin) {
    var scope = this
      ;

    // Crazy window open/close hacks and mobile chrome on iOS workarounds

    //
    // LDS.org
    //
    StLogin.makeLogin(scope, 'lds', '/auth/ldsconnect', function (err, session) {
      $modalInstance.close(session);
    });

    //
    // Facebook
    //
    StLogin.makeLogin(scope, 'fb', '/auth/facebook', function (err, session) {
      $modalInstance.close(session);
    });

    //
    // Twitter
    //
    StLogin.makeLogin(scope, 'tw', '/authn/twitter', function (err, session) {
      $modalInstance.close(session);
    });


    //
    // Modal
    //
    scope.cancel = function () {
      $modalInstance.dismiss();
    };

    scope.showEmail = function () {
      scope.emailShown = true;
    };

    scope.loginId = "";
    scope.loginSecret = "";
    scope.loginWithBasicAuth = function () {
      var auth = { 'Authorization': 'Basic ' + btoa(scope.loginId + ':' + scope.loginSecret) }
        ;

      // TODO UI needs spinner
      $http.post('/api/session/basic', null, { headers: auth }).then(function (resp) {
        console.log('[Basic Auth] resp.data');
        console.log(resp.data);

        if (resp.data && resp.data.currentLoginId) {
          scope.alertType = "";
          scope.alertMessage = "";
          scope.loginToken = "";
          $modalInstance.close(resp.data);
        } else {
          scope.alertMessage = "Invalid Access Token";
          scope.alertType = 'alert-danger';
        }
      });
    };
    scope.loginToken = "";
    scope.loginWithToken = function () {
      var auth = { 'Authorization': 'Bearer ' + scope.loginToken }
        ;

      scope.alertType = 'alert-info';
      scope.alertMessage = "Logging in...";

      // TODO allow use of token in place of session cookies
      // TODO XSRF-TOKEN in cookie and X-XSRF-TOKEN in header
      // $http.defaults.headers.common.Authorization = 'Bearer xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      $http.post('/api/session/bearer', null, { headers: auth }).then(function (resp) {
        console.log('[Bearer Auth] resp.data');
        console.log(resp.data);

        if (resp.data && resp.data.currentLoginId) {
          scope.alertType = "";
          scope.alertMessage = "";
          scope.loginToken = "";
          $modalInstance.close(resp.data);
        } else {
          scope.alertMessage = "Invalid Access Token";
          scope.alertType = 'alert-danger';
        }
      });
    };
  });
