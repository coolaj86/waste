'use strict';

angular.module('sortinghatApp')
  .controller('NavCtrl', function ($state, StLogin, StSession, mySession) {
    var $scope = this
      ;

    function updateSession(session) {
      if (session && 'guest' !== session.role) {
        $scope.session = mySession;
      } else {
        $scope.session = null;
      }
    }

    // XXX this could also be done via dirty checking
    // using a shared object, but I think
    // this approach is more familiar to the average programmer
    StSession.subscribe(updateSession);

    $scope.tabs = [
      { active: $state.includes('root')
      , title: 'Home'
      , href: $state.href('root')
      }
    , { active: $state.includes('about')
      , title: 'About'
      , href: $state.href('about')
      }
    ];

    $scope.login = function () {
      StLogin.show().then(function (data) {
        updateSession(data);
      }, function () {
        // nada
      });
    };

    $scope.logout = function () {
      console.log('SNTHSNHT');
      StSession.destroy().then(function () {
        updateSession(null);
      }, function () {
        // nada
      });
    };
  });
