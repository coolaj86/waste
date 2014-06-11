'use strict';

angular.module('yololiumApp')
  .service('StSession', function StSession($http, $q, $timeout, StApi) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var shared = { session: null, touchedAt: 0 }
      , gettingSession = null
      , noopts = {}
      , notifier = $q.defer()
      , apiPrefix = StApi.apiPrefix
      ;

    // TODO move this to server (and make it real)
    function mangle(data) {
      if (!data || data.error) {
        return data;
      }

      data.loginsMap = {};
      data.logins.forEach(function (l) {
        data.loginsMap[l.id] = l;
      });
      data.login = data.loginsMap[data.mostRecentLoginId];
      /*
      data.logins.some(function (l) {
        if (l.id === data.mostRecentLoginId) {
          data.login = l;
          return true;
        }
      });
      */

      data.accountsMap = {};
      data.accounts.forEach(function (a) {
        data.accountsMap[a.id] = a;
      });
      data.account = data.accountsMap[data.selectedAccountId];
      /*
      data.accounts.some(function (a) {
        if (a.id === data.selectedAccountId) {
          data.account = a;
          return true;
        }
      });
      */

      data.account = data.account || {};
      data.account.role = data.account.role || 'guest';
      data.connected = {};
      data.account.loginIds = data.account.loginIds || [];
      data.account.loginIds.forEach(function (typedUid) {
        var parts = typedUid.split(':')
          , type = parts.shift()
          , uid = parts.join(':')
          ;

        // TODO carry more info about logins in account
        data.connected[type] = data.connected[type] || {};
        data.connected[type][uid] = data.loginsMap[typedUid] || {
          type: type
        , uid: uid
        , typedUid: typedUid
        , id: typedUid
        };
      });

      if (data.selectedAccountId && 'guest' === data.account.role) {
        data.account.role = 'user';
      }

      return data;
    }

    function read(opts) {
      opts = opts || noopts;
      var d = $q.defer()
        , staletime = 5 * 60 * 60 * 1000
        ;

      if (opts.expire || (Date.now() - shared.touchedAt > staletime)) { // also try Date.now() - shared.session.touchedAt
        gettingSession = null;
        shared.session = null;
      }

      if (gettingSession) {
        return gettingSession;
      }

      gettingSession = d.promise;

      if (shared.session) {
        $timeout(function () {
          // premangled
          d.resolve(shared.session);
        }, 0);
        return gettingSession;
      }

      $http.get(apiPrefix + '/session').success(function (_userSession) {
        //console.log('_userSession', _userSession);
        update(_userSession);
        //shared.session = mangle(_userSession);
        //shared.touchedAt = Date.now();
        d.resolve(shared.session);
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
    function update(session) {
      gettingSession = null;
      shared.touchedAt = Date.now();
      shared.session = mangle(session);
      // TODO Object.freeze (Mozilla's deepFreeze example)
      notifier.notify(shared.session);
      return shared.session;
    }

    function subscribe(fn, scope) {
      if (!scope) {
        // services and such
        notifier.notify(shared.session);
        return;
      }

      // This is better than using a promise.notify
      // because the watches will unwatch when the controller is destroyed
      scope.__stsessionshared__ = shared;
      scope.$watch('__stsessionshared__.session', function () {
        fn(shared.session);
      }, true);
    }

    function destroy() {
      var d = $q.defer()
        ;

      shared.session = null;
      gettingSession = null;
      $http.delete(apiPrefix + '/session').success(function (resp) {
        shared.session = null;
        gettingSession = null;
        update(resp.data);
        d.resolve(resp.data);
      });
      return d.promise;
    }

    return {
      get: read
    , create: create
    , read: read
    , update: update
    , destroy: destroy
    , subscribe: subscribe
    , oauthPrefix: StApi.oauthPrefix
    };
  });
