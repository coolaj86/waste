'use strict';

angular.module('yololiumApp')
  .controller('AccountCtrl', function ($scope, StLogin, StSession, mySession) {
    var A = this
      , oauthPrefix = StSession.oauthPrefix
      ;

    if (mySession && mySession.profiles) {
      mySession.profiles.forEach(function (profile) {
        mySession[profile.provider] = true;
      });
    }
    A.session = mySession;

    function assignAccount(err, session) {
      session.logins.some(function (login) {
        if (session.mostRecentLoginId === login.id) {
          A.profile = login;
          return true;
        }
      });
      session.accounts.some(function (account) {
        if (session.selectedAccountId === account.id) {
          A.account = account;
          return true;
        }
      });
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
    StLogin.makeLogin(A, 'facebook', oauthPrefix + '/facebook/connect', assignAccount);

    //
    // Twitter
    //
    StLogin.makeLogin(A, 'twitter', oauthPrefix + '/twitter/authn/connect', assignAccount);

    //
    // Tumblr
    //
    StLogin.makeLogin(A, 'tumblr', oauthPrefix + '/tumblr/connect', assignAccount);

    //
    // LDS.org
    //
    StLogin.makeLogin(A, 'ldsconnect', oauthPrefix + '/ldsconnect/connect', assignAccount);

    assignAccount(null, mySession);
  });
