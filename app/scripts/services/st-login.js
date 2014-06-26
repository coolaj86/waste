'use strict';

angular.module('yololiumApp')
  .service('StLogin', function StLogin($timeout, $q, $modal) {
    function showLoginModal() {
      //var d = $q.defer()
      //  ;

      return $modal.open({
        templateUrl: '/views/login.html'
      , controller: 'LoginCtrl as L'
      , backdrop: 'static'
      , resolve: {
        }
      }).result.then(function () {
        return $timeout(function () {
          console.log('opening the account update');
          return $modal.open({
            templateUrl: '/views/account-new.html'
          , controller: 'AccountNewCtrl as A'
          , backdrop: 'static'
          , resolve: {
              mySession: ['StSession', function (StSession) {
                return StSession.get();
              }]
            }
          }).result;
        }, 10);
      });
      //return d.promise;
    }

    // TODO perhaps StSession should be using StLogin,
    // and not the other way around.
    return {
      showLoginModal: showLoginModal
    };
  });
