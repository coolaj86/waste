'use strict';

/**
 * @ngdoc service
 * @name yololiumApp.stOauthClients
 * @description
 * # stOauthClients
 * Service in the yololiumApp.
 */
angular.module('yololiumApp')
  .service('stOauthClients', ['StApi', '$http', function stOauthClients(StApi, $http) {
    var me = this
      , apiPrefix = StApi.apiPrefix
      ;

    function fetch() {
      return $http.get(apiPrefix + '/me/clients').then(function (resp) {
        console.log(resp.data);
        return resp.data.clients;
      });
    }

    function create(name, secret) {
      var app = { name: name };
      if (secret) app.secret = secret;

      return $http.post(apiPrefix + '/me/clients', app).then(function (resp) {
        return resp.data;
      });
    }

    me.fetch = fetch;
    me.create = create;
  }]);
