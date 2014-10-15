'use strict';

angular.module('yololiumApp')
  .service('StContacts', ['StApi', '$http', function StContacts(StApi, $http) {
    var me = this
      , apiPrefix = StApi.apiPrefix
      ;

    function fetch() {
      return $http.get(apiPrefix + '/me/contact').then(function (resp) {
        return resp.data.nodes;
      });
    }

    function remove(node) {
      return $http.delete(apiPrefix + '/me/contact/' + node.uuid, node).then(function (resp) {
        return resp.data;
      });
    }

    function create(node) {
      return $http.post(apiPrefix + '/me/contact', node).then(function(resp) {
        return resp.data;
      });
    }

    me.fetch = fetch;
    me.remove = remove;
    me.create = create;
  }]);
