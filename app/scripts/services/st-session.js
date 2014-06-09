'use strict';

angular.module('yololiumApp')
  .service('StSession', function StSession($http, $q, $timeout, StApi) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var user
      , gettingSession = null
      , userTouchedAt = 0
      , noopts = {}
      , notifier = $q.defer()
      , apiPrefix = StApi.apiPrefix
      ;

    // TODO move this to server (and make it real)
    function mangle(data) {
      if (!data || data.error || 'guest' === data.role) {
        return data;
      }

      console.log('pre-mangle');
      console.log(data);
      data.logins.some(function (l) {
        if (l.id === data.mostRecentLoginId) {
          data.login = l;
          return true;
        }
      });

      data.accounts.some(function (a) {
        if (a.id === data.selectedAccountId) {
          data.account = a;
          return true;
        }
      });

      data.profile = data.login || {};
      data.account = data.account || {};
      data.account.role = data.account.role || data.profile.role || 'guest';
      if (data.selectedAccountId && 'guest' === data.role) {
        data.account.role = 'user';
      }

      return data;
    }

    function read(opts) {
      console.log('called read');

      opts = opts || noopts;
      var d = $q.defer()
        , staletime = 5 * 60 * 60 * 1000
        ;

      if (opts.expire || (Date.now() - userTouchedAt > staletime)) { // also try Date.now() - user.touchedAt
        gettingSession = null;
        user = null;
      }

      if (gettingSession) {
        return gettingSession;
      }

      gettingSession = d.promise;

      if (user) {
        $timeout(function () {
          d.resolve(user);
        }, 0);
        return gettingSession;
      }

      $http.get(apiPrefix + '/session').success(function (_user) {
        console.log('[P][1] http resolve');
        user = _user;
        userTouchedAt = Date.now();
        d.resolve(mangle(user));
      });

      return gettingSession;
    }

    function create(email, passphrase) {
      var d = $q.defer()
        ;

      $http.post(apiPrefix + '/session', {
        email: email
      , password: passphrase
      }).success(function (data) {
        d.resolve(mangle(data));
      });

      return d.promise;
    }

    // external auth (i.e. facebook, twitter)
    function update(data) {
      gettingSession = null;
      user = data;
      userTouchedAt = Date.now();
      notifier.notify(mangle(user));
    }

    function on(fn) {
      notifier.promise.then(null, null, fn);
    }

    function destroy() {
      var d = $q.defer()
        ;

      user = null;
      $http.delete(apiPrefix + '/session').success(function () {
        d.resolve();
      });
      return d.promise;
    }

    return {
      get: read
    , create: create
    , read: read
    , update: update
    , destroy: destroy
    , subscribe: on
    , oauthPrefix: StApi.oauthPrefix
    };
  });
