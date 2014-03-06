'use strict';

angular.module('sortinghatApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ui.router',
  'ui.bootstrap'
])
  .config(function ($stateProvider, $urlRouterProvider) {
    var nav
      , footer
      ;

    nav = {
      templateUrl: '/views/nav.html'
    , controller: 'NavCtrl as N'
    };

    footer = {
      templateUrl: '/views/footer.html'
    };

    //$locationProvider.html5Mode(true);

    // Deal with missing trailing slash
    $urlRouterProvider.rule(function($injector, $location) {
      var path = $location.path(), search = $location.search()
        ;

      if (path[path.length - 1] === '/') {
        return;
      }

      if (Object.keys(search).length === 0) {
        return path + '/';
      }

      var params = []
        ;

      angular.forEach(search, function(v, k){
        params.push(k + '=' + v);
      });

      return path + '/?' + params.join('&');
    });
    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('root', {
        url: '/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/main.html'
          , controller: 'MainCtrl as M'
          , resolve: {
              data: function (Data) {
                return Data.get();
              }
            , mySession: function (StSession) {
                return StSession.get();
              }
            }
          }
        , footer: footer
        }
      })
      .state('account', {
        url: '/account/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/account.html'
          , controller: "AccountCtrl as A"
          , resolve: {
              mySession: function (StSession) {
                return StSession.get();
              }
            }
          }
        , footer: footer
        }
      })
      .state('about', {
        url: '/about/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/about.html'
          }
        , footer: footer
        }
      })
      ;

  });
