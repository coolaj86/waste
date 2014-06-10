'use strict';

angular.module('yololiumApp')
  .service('StLogin', function StLogin($timeout, $q, $modal, StSession, StApi) {
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
      }).result.then(function () {
        return $timeout(function () {
          console.log('opening the account update');
          return $modal.open({
            templateUrl: '/views/account-new.html'
          , controller: 'AccountNewCtrl as A'
          , backdrop: 'static'
          , resolve: {
              mySession: function (StSession) {
                return StSession.get();
              }
            }
          }).result;
        }, 10);
      });
      //return d.promise;
    }

    function show(opts) {
      opts = opts || {};
      var d = $q.defer()
        ;

      function update(session) {
        if (session && !session.error && 'guest' !== session.account.role) {
          StSession.update(session);
        }
        d.resolve(session);
      }

      function doShow() {
        showLoginModal().then(update, d.reject);
      }

      StSession.get().then(function (session) {
        if (!opts.force && session && !session.error && 'guest' !== session.account.role) {
          d.resolve(session);
        } else {
          doShow();
        }
      }, doShow);

      return d.promise;
    }

    function makeLogins(scope, cb) {
      var providers
        ;

      providers = {
        facebook: '/facebook/connect'
      , twitter: '/twitter/authn/connect'
      , tumblr: '/tumblr/connect'
      , ldsconnect: '/ldsconnect/connect'
      };

      Object.keys(providers).forEach(function (key) {
        makeLogin(scope, key, StApi.oauthPrefix + providers[key], cb);
      });
    }

    function makeLogin(scope, abbr, authUrl, cb) {
      var uAbbr = abbr.replace(/(^.)/, function ($1) { return $1.toUpperCase(); })
        , login = {}
        ;

      login['poll' + uAbbr + 'Login'] = function () {
        //jQuery('body').append('<p>' + 'heya' + '</p>');
        console.log('[debug]', 'poll' + uAbbr + 'Login');
        if (!window.localStorage) {
          clearInterval(login['poll' + uAbbr + 'Int']);
          // doomed!
          return;
        }

        if (localStorage.getItem(abbr + 'Status')) {
          window['complete' + uAbbr + 'Login'](localStorage.getItem(abbr + 'Status'));
        }
      };
      window['complete' + uAbbr + 'Login'] = function (url, accessToken, email, link) {
        var err = null
          ;

        if (/deny|denied/i.test(url)) {
          err = new Error('Access Denied: ' + url);
        } else if (/error/i.test(url)) {
          err = new Error('Auth Error: ' + url);
        }

        console.log('[debug]', 'complete' + uAbbr + 'Login');
        clearInterval(login['poll' + uAbbr + 'Int']);
        localStorage.removeItem(abbr + 'Status');
        login.loginCallback(err);

        console.log('accessed parent function complete' + uAbbr + 'Login', accessToken, email, link);
        //jQuery('body').append('<p>' + url + '</p>');
        login.loginWindow.close();
        delete login.loginWindow;
      };
      scope['loginWith' + uAbbr + ''] = function () {
        console.log('[debug]', 'loginWith' + uAbbr + '');
        login.loginCallback = function (err) {
          console.log('loginCallback');
          if (err) {
            cb(err);
            return;
          }

          StSession.read({ expire: true }).then(function (session) {
            console.log('StSession.read()', session);
            if (session.error) {
              StSession.destroy();
            }
            cb(null, session);
          });
        };
        login.loginWindow = window.open(authUrl);
        login['poll' + uAbbr + 'Int'] = setInterval(login['poll' + uAbbr + 'Login'], 300);
      };
    }

    return {
      show: show
    , makeLogin: makeLogin
    , makeLogins: makeLogins
    , testProfiles: StApi.testProfiles
    };
  });
