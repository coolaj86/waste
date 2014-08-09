'use strict';

angular.module('yololiumApp')
  .service('StLogin', ['$timeout', '$q', '$modal', function StLogin($timeout, $q, $modal) {
    var me = this
      ;

    me.showLoginModal = function (opts) {
      return $modal.open({
        templateUrl: '/views/login.html'
      , controller: 'LoginCtrl as L'
      , backdrop: 'static'
      , keyboard: true
      , resolve: {
          // so that we could add an explanation or something
          stLoginOptions: [function () {
            return opts;
          }]
        }
      }).result;
    };

    me.ensureLogin = function (currentSession, opts) {
      opts = opts || {};

      // TODO this probably belongs in StSession?
      function hasLogin(session) {
        // BUG a new user won't have an account yet
        return session && session.mostRecentLoginId && session.logins && session.logins.length >= 1;
      }

      if (!opts.force && hasLogin(currentSession)) {
        return $q.when(currentSession);
      }

      return me.showLoginModal(opts).then(function (newSession) {
        var error
          ;

        console.log('[st-login.js] showLoginModal callback');
        if (hasLogin(newSession)) {
          return newSession;
        }

        error = {
          name: "UnensuredLogin"
        , message: "Didn't do a very good job of ensuring the login..."
        , toString: function () {
            return this.message;
          }
        };
        console.log("[st-login.js]", error.message);
        throw error;
      });
    };

    return me;
  }]);
