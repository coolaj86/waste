'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:OauthClientsCtrl
 * @description
 * # OauthClientsCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('OauthClientsCtrl', function (stOauthClients) {
    var OA = this
      ;

    OA.clients = [];

    stOauthClients.fetch().then(function (clients) {
      OA.clients = clients;
    });

    OA.addApp = function () {
      stOauthClients.create(OA.appName, OA.appSecret).then(function (client) {
        OA.clients.push(client);
      });
    };
  });
