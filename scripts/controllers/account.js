'use strict';

angular.module('sortinghatApp')
  .controller('AccountCtrl', function ($scope, StLogin, mySession) {
    var A = this
      ;

    if (mySession && mySession.profiles) {
      mySession.profiles.forEach(function (profile) {
        mySession[profile.provider] = true;
      });
    }
    A.session = mySession;

    function assignAccount(err, session) {
      /*
      session.profiles.some(function (login) {
        if (session.currentLoginId.replace(/^[^:]+:/, '') === login.id) {
          A.profile = login;
          return true;
        }
      });
      */
      A.profile = session;
    }

    A.login = function () {
      StLogin.show({ force: true }).then(function (data) {
        console.log('hello');
        console.log(data);
        assignAccount(null, data);
      }, function (err) {
        console.error("Couldn't show login window???");
        console.error(err);
        // nada
      });
    };

    //
    // Facebook
    //
    StLogin.makeLogin(A, 'fb', '/auth/facebook', assignAccount);

    //
    // Twitter
    //
    StLogin.makeLogin(A, 'tw', '/authn/twitter', assignAccount);

    //
    // Tumblr
    //
    StLogin.makeLogin(A, 'tumblr', '/auth/tumblr', assignAccount);

    //
    // LDS.org
    //
    StLogin.makeLogin(A, 'lds', '/auth/ldsconnect', assignAccount);

    assignAccount(null, mySession);
  });
