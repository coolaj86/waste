'use strict';

angular.module('sortinghatApp')
  .service('Data', function Wards($http, $q, $timeout) {
    var shared = { data: {} }
      ;

    // AngularJS will instantiate a singleton by calling "new" on this function
    function get () {
      var d = $q.defer()
        ;

      if (Object.keys(shared.data).length) {
        $timeout(function () {
          d.resolve(shared.data);
        });
      }

      $http.get('./data.json').success(function (_data) {
        shared.data = _data;
        console.log(shared.data);

        d.resolve(shared.data);
      });

      return d.promise;
    }

    return {
      get: get
    };
  });
