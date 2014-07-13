'use strict';

angular.module('yololiumApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'duScroll',
  'ui.router',
  'ui.bootstrap',
  'steve'
])
  .config(function ($stateProvider, $urlRouterProvider/*, stConfig*/) {
    var nav
      , footer
      ;

    // This identifies your website in the createToken call
    //window.Stripe.setPublishableKey(StApi.stripe.publicKey);

    // IMPORTANT: (Issue #4)
    // These funny arrays (in resolve) are neccessary because ui.router
    // doesn't get properly mangled by ng-min
    // See https://github.com/yeoman/generator-angular#minification-safe
    nav = {
      templateUrl: '/views/nav.html'
    , controller: 'NavCtrl as N'
    , resolve: {
        mySession: ['StSession', function (StSession) {
          return StSession.get();
        }]
      }
    };

    footer = {
      templateUrl: '/views/footer.html'
    , controller: 'FooterCtrl as F'
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
              mySession: ['StSession', function (StSession) {
                console.log('hello world');
                return StSession.get();
              }]
            }
          }
        , footer: footer
        }
      })

      // This is the root state for not-logged-in users
      .state('splash', {
        url: '/splash/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/splash.html'
          , controller: 'SplashCtrl as S'
          , resolve: {
              mySession: ['StSession', function (StSession) {
                return StSession.get();
              }]
            }
          }
        , footer: footer
        }
      })

      .state('user', {
        url: '/user/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/user.html'
          , controller: 'UserCtrl as U'
          , resolve: {
              mySession: ['StSession', function (StSession) {
                return StSession.get();
              }]
            }
          }
        , footer: footer
        }
      })

      .state('admin', {
        url: '/admin/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/admin.html'
          , controller: 'AdminCtrl as A'
          , resolve: {
              mySession: ['StSession', function (StSession) {
                return StSession.ensureSession();
              }]
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
              mySession: ['StSession', function (StSession) {
                return StSession.get();
              }]
            }
          }
        , footer: footer
        }
      })
      .state('store', {
        url: '/store/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/store.html'
          , controller: "StoreCtrl as S"
          , resolve: {
              mySession: ['StSession', function (StSession) {
                return StSession.get();
              }]
            }
          }
        , footer: footer
        }
      })
      .state('lds', {
        parent: 'main'
      })
      .state('weddings', {
        parent: 'main'
      , url: 'weddings/'
      })
      .state('about', {
        parent: 'main'
      })
      .state('privacy', {
        parent: 'main'
      })
      /*
      , {
        url: '/about/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/about.html'
          }
        , footer: footer
        }
      })
      */
      ;
  })
  .run(function ($rootScope, $state, StSession) {
    var currentSession
      ;

    // TODO subscribe to session changes
    StSession.get().then(function (session) {
      currentSession = session;
    });

    $rootScope.stStateHack = {};
    $rootScope.$on('$stateChangeStart', function (e, to, params, from) {
      // TODO https://github.com/angular-ui/ui-router/issues/92 @christopherthielen (at the very bottom)
      $rootScope.stStateHack.to = to && to.name;
      $rootScope.stStateHack.from = from && "" !== from.name && from.name;
      $rootScope.stStateHack.params = params;

      console.log('change start', to, from);
      if (!angular.isFunction(to.data && to.data.rule)) { return; }

      var result = to.data.rule(currentSession)
        ;

      // if (!result || result.ok) { /*business as usual*/ } else { /* other thing */ }
      if (result && result.to) {
        e.preventDefault();
        // TODO go to authentication state
        // TODO include previous state in params (so it knows where to go next)
        $state.go(result.to, result.params, { notify: false });
      }
    });

    $rootScope.$on('$stateChangeError', function (e, to) {
      console.error(e);
      console.error(to);
      // TODO if login is rejected, don't finish the state change
    });
  })
  ;
