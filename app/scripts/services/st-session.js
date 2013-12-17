'use strict';

angular.module('sortinghatApp')
  .service('StSession', function StSession($http, $q, $timeout) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var user
      , noopts = {}
      ;

    function read(opts) {
      opts = opts || noopts;
      var d = $q.defer()
        ;

      if (opts.expire) { // also try Date.now() - user.touchedAt
        user = null;
      }

      d.promise.then(function () {
        console.log('resolved by StSession');
      });

      console.log('called read');
      if (user) {
        $timeout(function () {
          d.resolve(user);
        }, 0);
        console.log('returning resolved promise');
        return d.promise;
      }

      $http.get('/api/session').success(function (_user) {
        console.log('resolve');
        user = _user;
        user.touchedAt = Date.now();
        d.resolve(user);
      });

      return d.promise;
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
    };
  });
