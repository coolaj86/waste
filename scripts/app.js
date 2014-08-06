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
  .config(['$stateProvider', '$urlRouterProvider', '$httpProvider', function ($stateProvider, $urlRouterProvider, $httpProvider/*, stConfig*/) {
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
          body: {
            template: '<div></div>'
          , controller: ['$state', 'mySession', 'stConfig', function ($state, mySession, stConfig) {
              if (!stConfig.useSplash) {
                $state.go('home');
                return;
              }

              if (!mySession || !mySession.account || 'guest' === mySession.account.role) {
                $state.go('splash');
              } else {
                $state.go('home');
              }
            }]
          , resolve: {
              mySession: ['StSession', function (StSession) {
                console.log('hello world');
                return StSession.get();
              }]
            }
          }
        }
      })

      .state('home', {
        views: {
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

      .state('call', {
        url: '/call/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/call.html'
          , controller: 'CallCtrl as Call'
          , resolve: {
              mySession: ['StSession', function (StSession) {
                return StSession.ensureSession('admin');
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

      .state('push', {
        url: '/push/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/push.html'
          , controller: "PushCtrl as P"
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

      // states that don't change the url
      /*
      .state('about', {
        parent: 'main'
      })
      .state('privacy', {
        parent: 'main'
      })
      */
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
      .state('oauth-clients', {
        url: '/apps/'
      , views: {
          nav: nav
        , body: {
            templateUrl: 'views/oauth-clients.html'
          , controller: 'OauthClientsCtrl as OA'
          }
        , footer: footer
        }
      })
      ;

    // alternatively, register the interceptor via an anonymous factory
    $httpProvider.interceptors.push(function(/*$q*/) {
      var recase = window.Recase.create({ exceptions: {} })
        ;

      return {
        'request': function (config) {
          /*
          if (!/.html/.test(config.url)) {
            console.log('[$http] request');
            console.log(config);
            //console.log(config.method, config.url);
          }
          */
          if (config.data
              && !/^https?:\/\//.test(config.url)
              && /json/.test(config.headers['Content-Type'])
          ) {
            config.data = recase.snakeCopy(config.data);
          }
          return config;
        }
      , 'requestError': function (rejection) {
          //console.log('[$http] requestError');
          //console.log(rejection);
          return rejection;
        }
      , 'response': function (response) {
          var config = response.config
            ;

          // our own API is snake_case (to match webApi / ruby convention)
          // but we convert to camelCase for javascript convention
          if (!/^https?:\/\//.test(config.url) && /json/.test(response.headers('Content-Type'))) {
            response.data = recase.camelCopy(response.data);
          }
          return response;
        }
      , 'responseError': function (rejection) {
          //console.log('[$http] responseError');
          //console.log(rejection);
          return rejection;
        }

      };
    });
  }])
  .run(['$rootScope', '$state', 'StSession', function ($rootScope, $state, StSession) {
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
  }])
  ;
