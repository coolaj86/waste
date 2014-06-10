'use strict';

angular.module('yololiumApp')
  .controller('AccountCtrl', function ($scope, StLogin, StSession, mySession) {
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
          A.providers[type] = session.connected[type][uid];
          return true;
        });
      });

      A.session = session;
      A.account = session.account;
    }
    init(null, mySession);

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

    StLogin.makeLogins(A, init);
    StSession.subscribe(init, $scope);
  });
