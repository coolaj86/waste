'use strict';

/**
 * @ngdoc service
 * @name yololiumApp.StAccount
 * @description
 * # StAccount
 * Service in the yololiumApp.
 */
angular.module('yololiumApp')
  .service('StAccount', function StAccount($http, StApi) {
    var me = this
      ;

    // AngularJS will instantiate a singleton by calling "new" on this function
    
    function update(id, updates) {
      if (!id) {
        return create(updates);
      }

      return $http.post(StApi.apiPrefix + '/accounts' + id, updates).then(function (resp) {
        console.log('UPDATE account');
        console.log(resp);
        return resp;
      });
    }

    function create(updates) {
      if (updates.id) {
        return update(updates.id, updates);
      }

      return $http.post(StApi.apiPrefix + '/accounts', updates).then(function (resp) {
        console.log('CREATE account');
        console.log(resp);
        return resp;
      });
    }

    me.update = update;
    me.create = create;
  });
