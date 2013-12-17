'use strict';

angular.module('sortinghatApp')
  .service('StLogin', function StLogin($q, $modal, StSession) {
    function showLoginModal() {
      //var d = $q.defer()
      //  ;

      return $modal.open({
        templateUrl: '/views/login.html'
      , controller: 'LoginCtrl as L'
      , backdrop: 'static'
      , resolve: {
          mySession: function (StSession) {
            return StSession.get();
          }
        }
      }).result;
      //return d.promise;
    }

    function show() {
      var d = $q.defer()
        ;

      function update(data) {
        if (data && 'guest' !== data.role) {
          StSession.update(data);
        }
        d.resolve(data);
      }

      function doShow() {
        showLoginModal().then(update, d.reject);
      }

      StSession.get().then(function (data) {
        if (data && 'guest' !== data.role) {
          d.resolve(data);
        } else {
          doShow();
        }
      }, doShow);

      return d.promise;
    }

    return {
      show: show
    };
  });
