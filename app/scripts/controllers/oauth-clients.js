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
      console.log('asdf');
      $http.post(StApi.apiPrefix + '/me/clients', {
        id: OA.appID
      , name: OA.appName
      , secret: "12345-12345-12345-12345"
      , permissions: []
      }).then(function (data) {
        console.log('data stuff');
        console.log(data.data);
      });
    };
  });
