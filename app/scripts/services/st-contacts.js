'use strict';

angular.module('yololiumApp')
  .service('StContacts', ['StApi', '$http', function StContacts(StApi, $http) {
    var me = this
      , apiPrefix = StApi.apiPrefix
      ;

    function fetch() {
      return $http.get(apiPrefix + '/me/contacts').then(function (resp) {
        return resp.data.nodes;
      });
    }

    function update(node) {
      return $http.post(apiPrefix + '/me/contacts/' + node.uuid, node).then(function (resp) {
        return resp.data;
      });
    }

    function create(node) {
      return $http.post(apiPrefix + '/me/contacts', node).then(function(resp) {
        return resp.data;
      });
    }

    me.fetch = fetch;
    me.update = update;
    me.create = create;
  }]);
