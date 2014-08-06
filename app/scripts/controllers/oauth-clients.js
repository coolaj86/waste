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
      , sampleapps = [
          {
            id: 'abcdef123'
          , name: "farmville"
          , secret: "abcde-defcde-12234abdc0987-0987-1234"
          , permissions: []
          }
        , {
            id: '123412341'
          , name: "instagram"
          , secret: "abcde-defcde-12234abdc0987-0987-1234"
          , permissions: []
          }
      ]
      ;

    OA.clients = sampleapps;

    OA.addApp = function () {
      var app = { name: OA.appName };
      if (OA.appSecret) app.secret = OA.appSecret;

      $http.post(StApi.apiPrefix + '/me/clients', app).then(function (data) {
        OA.clients.push(data.data);
      });
    };
  });
