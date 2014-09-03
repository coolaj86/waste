'use strict';

angular.module('yololiumApp')
  .controller('NavCtrl', ['$rootScope', '$scope', '$state', 'StSession', 'mySession', 'StPayInvoice', 'StApi', function ($rootScope, $scope, $state, StSession, mySession, StPayInvoice, StApi) {
    var scope = this
      , allTabs
      ;

    scope.logo = StApi.business.logo;
    scope.title = StApi.business.title;

    $rootScope.$on('$stateChangeSuccess', function () {
      updateSession(mySession);
    });

    function updateSession(session) {
      allTabs = [
        { active: $state.is('root')
        , title: 'Home'
        , href: $state.href('root')
        }
      , { active: $state.includes('oauth-clients')
        , title: 'Apps'
        , href: $state.href('oauth-clients')
        }
      , { active: $state.includes('store')
        , title: 'Store'
        , href: $state.href('store')
        }
      , { active: $state.includes('admin')
        , title: 'Admin'
        , href: $state.href('admin')
        , roles: ['admin', 'root']
        }
      , { active: $state.includes('push')
        , title: 'Push'
        , href: $state.href('push')
        }
      , { active: $state.includes('user')
        , title: 'User'
        , href: $state.href('user')
        , roles: ['user']
        }
      , { active: $state.includes('contacts')
        , title: 'Contacts'
        , href: $state.href('contacts')
        }
      , { active: $state.includes('about')
        , title: 'About'
        , href: $state.href('about')
        }
      ];

      if (!session || !session.account || session.guest || 'guest' === session.account.role) {
        session = null;
      }

      var role = session && session.account.role
        ;

      if ('root' === role) {
        role = 'admin';
      }

      scope.session = session;
      scope.account = session && session.account;
      scope.tabs = allTabs.filter(function (tab) {
        if (!tab.roles || !tab.roles.length) { return true; }
        if (!scope.session) { return false; }
        return -1 !== tab.roles.indexOf(role);
      });
      allTabs.forEach(function (tab) {
        if (tab.active) {
          scope.activeTab = tab.title;
        }
      });
    }

    StSession.subscribe(updateSession, $scope);
    updateSession(mySession);

    scope.showLoginModal = function () {
      StSession.ensureSession().then(function (session) {
        updateSession(session);
      }, function () {
        // nada
      });
    };

    scope.logout = function () {
      console.info("You logged out. Sad day. :-/");
      StSession.destroy().then(function () {
        updateSession(null);
      }, function () {
        // nada
      });
    };

    scope.payInvoice = function () {
      StPayInvoice.show();
    };
  }]);
