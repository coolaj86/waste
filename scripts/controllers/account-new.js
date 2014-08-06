'use strict';

angular.module('yololiumApp')
  .controller('AccountNewCtrl', ['$scope', '$modalInstance', 'StAccount', 'StSession', 'mySession', 'stAccountRequired', function ($scope, $modalInstance, StAccount, StSession, mySession, stAccountRequired) {
    var scope = this
      ;

    // TODO calculate missing
    scope.missing = {};

    // This dialog is opened to update necessary account details
    // It should be passed options to inform the dialog which
    // missing fields are necessary to show at this time
    //
    // Examples:
    // we want to get facebook but haven't connected yet, so we should show the connection dialog
    // we just logged in for the first time and don't have an account or a local login
    function init(session) {
      // session is always ensured as part of login
      mySession = session;

      var defaultAction = 'create'
        ;

      scope.account = scope.account || session.account || {};
      if (scope.account.id) {
        defaultAction = 'update';
      }

      scope.accountAction = scope.accountAction || defaultAction;

      scope.account = scope.account || {};
      scope.delta = scope.delta || {};
      scope.delta.localLogin = scope.delta.localLogin || {};
      scope.logins = session.logins.map(function (login) {
        return {
          comment: 'local' === login.provider ? (login.uid || 'username') : login.provider
        , id: login.id
        , uid: login.uid
        , provider: login.provider
        , type: login.type
        , link: true
        };
      });

      console.log('[new account] session.logins');
      console.log(session.logins);
      session.logins.some(function (login) {
        if ('local' === (login.type || login.provider)) {
          scope.account.localLoginId = login.id;
          scope.delta.localLogin.id = login.id;
        }
      });

      // login is always ensured prior to account
      if (session.login.emails) {
        scope.delta.email = session.login.emails[0] || {};
        scope.delta.email = scope.delta.email.value;
      }
      if (!scope.delta.email) {
        session.logins.some(function (login) {
          scope.delta.email = (login.emails && login.emails[0] || {}).value;
          return scope.delta.email;
        });
      }

      session.account = session.account || {};
      Object.keys(session.account).forEach(function (field) {
        scope.account[field] = session.account[field];
      });

      stAccountRequired.forEach(function (r) {
        if (!scope.account[r]) {
          scope.missing[r] = true;
        }
      });
    }
    init(mySession);
    StSession.subscribe(init, $scope);

    scope.updateAccount = function () {
      console.log('update account');
      console.log(scope.delta);
      scope.delta.logins = scope.logins.filter(function (l) { return l.link; });
      StAccount.update(mySession.selectedAccountId, scope.delta).then(function (session) {
        console.log('UPDATE 1');
        console.log(session);
        StSession.update(session);

        $modalInstance.close(session);
      });
    };
  }]);
