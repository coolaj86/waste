'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:OauthCtrl
 * @description
 * # OauthCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('OauthCtrl', function ($scope, $http, $stateParams, StSession, StApi) {
    var scope = this
      ;

    console.log('$stateParams');
    console.log($stateParams);

    StSession.ensureSession(
      // role
      null
      // TODO login opts (these are hypothetical)
    , { close: false
      , options: ['login', 'create']
      , default: 'login'
      , includeAccount: true // show the account stuff when asking to create a login
      }
      // TODO account opts
    , { verify: ['email', 'phone']
      }
    ).then(function (session) {
      console.log(session);
      console.log($stateParams);
      // get token from url param
      scope.token = $stateParams.token;
      $http.get(StApi.oauthPrefix + '/scope/' + $stateParams.token).then(function (resp) {
        console.log('resp.data');
        console.log(resp.data);
        if (scope.error || !scope.scope) {
          scope.error = scope.error || { message: 'missing scope request' };
          scope.rawResponse = resp.data;
          return;
        }
        scope.invalids = resp.data.invalids;
        scope.scope = resp.data.scope.map(function (name) {
          return { accepted: true, name: name };
        });
        scope.redirectUrl = resp.data.url;
        scope.transactionId = resp.data.transactionId;
      });
    });
  });
