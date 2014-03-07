'use strict';

angular.module('sortinghatApp')
  .service('StSession', function StSession($http, $q, $timeout) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var user
      , gettingSession
      , noopts = {}
      , notifier = $q.defer()
      ;

    function read(opts) {
      opts = opts || noopts;
      var d = $q.defer()
        ;

      if (gettingSession) {
        return gettingSession;
      }
      gettingSession = d.promise;

      if (opts.expire) { // also try Date.now() - user.touchedAt
        user = null;
      }

      gettingSession.then(function () {
        gettingSession = null;
        console.log('resolved by StSession');
      });

      console.log('called read');
      if (user) {
        $timeout(function () {
          d.resolve(user);
        }, 0);
        console.log('returning resolved promise');
        return gettingSession;
      }

      $http.get('/api/session').success(function (_user) {
        console.log('resolve');
        user = _user;
        user.touchedAt = Date.now();
        d.resolve(user);
      });

      return gettingSession;
    }

    function create(email, passphrase) {
      var d = $q.defer()
        ;

      $http.post('/api/session', {
        email: email
      , password: passphrase
      }).success(function (data) {
        d.resolve(data);
      });

      return d.promise;
    }

    // external auth (i.e. facebook, twitter)
    function update(data) {
      user = data;
      notifier.notify(user);
    }

    function on(fn) {
      notifier.promise.then(null, null, fn);
    }

    function destroy() {
      var d = $q.defer()
        ;

      user = null;
      $http.delete('/api/session').success(function () {
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
    };
  });
