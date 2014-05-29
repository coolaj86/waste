'use strict';

angular.module('yololiumApp')
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
    // Tumblr
    //
    StLogin.makeLogin(scope, 'tumblr', '/auth/tumblr', function (err, session) {
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

    //
    // ID & Secret (User & Pass)
    //
    scope.authId = "";
    scope.authSecret = "";
    scope.loginWithBasicAuth = function () {
      var auth = { 'Authorization': 'Basic ' + btoa(scope.authId + ':' + scope.authSecret) }
        ;

      // TODO UI needs spinner
      $http.post('/api/session/basic', null, { headers: auth }).then(function (resp) {
        console.log('[Basic Auth] resp.data');
        console.log(resp.data);

        if (resp.data && resp.data.currentLoginId) {
          scope.alertType = "";
          scope.alertMessage = "";
          scope.authToken = "";
          $modalInstance.close(resp.data);
        } else {
          scope.alertMessage = "Invalid Username & Passphrase";
          scope.alertType = 'alert-danger';
        }
      });
    };

    //
    // Access Token
    //
    scope.demoProfiles = StLogin.testProfiles;
    scope.authToken = "";
    scope.loginWithToken = function () {
      var auth = { 'Authorization': 'Bearer ' + scope.authToken }
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
          scope.authToken = "";
          $modalInstance.close(resp.data);
        } else {
          scope.alertMessage = "Invalid Access Token";
          scope.alertType = 'alert-danger';
        }
      });
    };
  });
