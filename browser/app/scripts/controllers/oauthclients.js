'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:OauthclientsCtrl
 * @description
 * # OauthclientsCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('OauthclientsCtrl', ['stOauthclients', function (stOauthclients) {
    var OA = this
      ;

    OA.clients = OA.clients || [];

    stOauthclients.fetch().then(function (clients) {
      OA.clients = clients;
    });

    OA.addApp = function () {
      stOauthclients.create(OA.appName, OA.appSecret).then(function (client) {
        OA.clients.push(client);
      });

      delete OA.appName;
      delete OA.appSecret;
    };
  }]);
