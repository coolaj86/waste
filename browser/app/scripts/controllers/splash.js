'use strict';

angular.module('yololiumApp')
  .controller('SplashCtrl', ['$scope', '$state', 'StSession', function ($scope, $state, StSession) {
    var firstTime = true;

    // We don't want to redirect on page load
    // (the splash page is a restful route)
    // we just want to redirect if the user logs in
    function redirect(session) {
      if (firstTime) {
        firstTime = false;
        return;
      }

      if ('guest' !== session.account.role) {
        $state.go('root');
      }
    }

    StSession.subscribe(redirect, $scope);
  }]);
