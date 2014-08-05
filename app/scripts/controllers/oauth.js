'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:OauthCtrl
 * @description
 * # OauthCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('OauthCtrl', function ($scope, $http, $stateParams, StSession) {
    var scope = this
      ;

    return;
    StSession.ensureSession().then(function (session) {
      console.log(session);
      console.log($stateParams);
      // get token from url param
      scope.token = $stateParams.token;
    });
  });
