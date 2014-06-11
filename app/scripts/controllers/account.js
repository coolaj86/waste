'use strict';

angular.module('yololiumApp')
  .controller('AccountCtrl', function ($scope, $http, StLogin, StSession, mySession, StApi) {
    var A = this
      ;

    function init(err, session) {
      A.session = null;
      A.account = null;

      if (!session) {
        return;
      }

      A.providers = {};

      Object.keys(session.connected).forEach(function (type) {
        Object.keys(session.connected[type]).some(function (uid) {
          // first
          //A.providers[type] = session.connected[type][uid];
          A.providers[type] = session.connected[type][uid];
          return true;
        });
      });

      A.session = session;
      A.account = session.account;
    }
    init(null, mySession);
    StSession.subscribe(function (session) {
      init(null, session);
    });

    A.showLoginModal = function () {
      StLogin.show({ force: true }).then(function (data) {
        console.log('hello');
        console.log(data);
        init(null, data);
      }, function (err) {
        console.error("Couldn't show login window???");
        console.error(err);
        // nada
      });
    };

    A.unlinkLogin = function (login) {
      $http.delete(StApi.apiPrefix + '/me/account/logins/' + login.id).then(function (resp) {
        StSession.update(resp.data);
        init(null, resp.data);

        console.log('resp.data');
        console.log(resp.data);
      });
    };

    StLogin.makeLogins(A, init);
    StSession.subscribe(init, $scope);
  });
