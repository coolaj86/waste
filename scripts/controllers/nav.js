'use strict';

angular.module('sortinghatApp')
  .controller('NavCtrl', function ($state, StLogin, StSession, mySession) {
    var $scope = this
      , allTabs
      ;

    allTabs = [
      { active: $state.includes('root')
      , title: 'Home'
      , href: $state.href('root')
      }
    , { active: $state.includes('admin')
      , title: 'Admin'
      , href: $state.href('admin')
      , roles: ['admin']
      }
    , { active: $state.includes('user')
      , title: 'User'
      , href: $state.href('user')
      , roles: ['user']
      }
    , { active: $state.includes('about')
      , title: 'About'
      , href: $state.href('about')
      }
    ];

    function updateSession(session) {
      console.log('[session] UPDATE');
      console.log(session);

      if (!session || session.error || 'guest' === session.role) {
        session = null;
      }

      $scope.session = session;
      $scope.account = session && session.account;
      $scope.tabs = allTabs.filter(function (tab) {
        if (!tab.roles || !tab.roles.length) { return true; }
        if (!$scope.session) { return false; }
        return -1 !== tab.roles.indexOf($scope.account.role);
      });
    }

    // XXX this could also be done via dirty checking
    // using a shared object, but I think
    // this approach is more familiar to the average programmer
    StSession.subscribe(updateSession);
    updateSession(mySession);

    $scope.login = function () {
      StLogin.show().then(function (data) {
        updateSession(data);
      }, function () {
        // nada
      });
    };

    $scope.logout = function () {
      StSession.destroy().then(function () {
        updateSession(null);
      }, function () {
        // nada
      });
    };
  });
