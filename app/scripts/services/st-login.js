'use strict';

angular.module('yololiumApp')
  .service('StLogin', function StLogin($timeout, $q, $modal) {
    var me = this
      ;

    me.showLoginModal = function (opts) {
      return $modal.open({
        templateUrl: '/views/login.html'
      , controller: 'LoginCtrl as L'
      , backdrop: 'static'
      , resolve: {
          // so that we could add an explanation or something
          stLoginOptions: function () {
            return opts;
          }
        }
      }).result;
    };

    me.ensureLogin = function (currentSession, opts) {
      opts = opts || {};

      // TODO this probably belongs in StSession?
      function isBetterThanGuest(session) {
        return session && !session.error && 'guest' !== session.account.role;
      }

      if (!opts.force && isBetterThanGuest(currentSession)) {
        return $q.when(currentSession);
      }

      return me.showLoginModal(opts).then(function (newSession) {
        if (isBetterThanGuest(newSession)) {
          return newSession;
        }

        // TODO throw an error?
        throw newSession;
      });
    };

    return me;
  });
