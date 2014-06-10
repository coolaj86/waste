'use strict';

angular.module('yololiumApp')
  .controller('NavCtrl', function ($scope, $state, StLogin, StSession, mySession) {
    var scope = this
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
      if (!session || !session.account || session.guest || 'guest' === session.account.role) {
        session = null;
      }

      scope.session = session;
      scope.account = session && session.account;
      scope.tabs = allTabs.filter(function (tab) {
        if (!tab.roles || !tab.roles.length) { return true; }
        if (!scope.session) { return false; }
        return -1 !== tab.roles.indexOf(scope.account.role);
      });
    }

    StSession.subscribe(updateSession, $scope);
    updateSession(mySession);

    scope.showLoginModal = function () {
      StLogin.show().then(function (session) {
        console.log('SESSION', session);
        updateSession(session);
      }, function () {
        // nada
      });
    };

    scope.logout = function () {
      StSession.destroy().then(function () {
        updateSession(null);
      }, function () {
        // nada
      });
    };
  });
