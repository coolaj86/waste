'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:OauthClientsCtrl
 * @description
 * # OauthClientsCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('OauthClientsCtrl', function (StApi, $http) {

    var OA = this
      ;

    $http.get(StApi.apiPrefix + '/me/clients').then(function (clients) {
      OA.clients = clients.data.clients;
    });

    OA.addApp = function () {
      var app = { name: OA.appName };
      if (OA.appSecret) app.secret = OA.appSecret;

      $http.post(StApi.apiPrefix + '/me/clients', app).then(function (data) {
        OA.clients.push(data.data);
      });
    };
  });
