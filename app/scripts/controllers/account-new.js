'use strict';

angular.module('yololiumApp')
  .controller('AccountNewCtrl', function ($scope, $http, $timeout, $modalInstance, StAccount, StSession, mySession) {
    var scope = this
      , account = { loginIds: [] }
      ;

    function init(session) {
      var defaultAction = 'create';

      mySession = session;
      if (scope.account && scope.account.id) {
        defaultAction = 'update';
      }
      scope.accountAction = scope.accountAction || defaultAction;
      scope.account = {};
      scope.delta = {};

      /*
      if ('guest' === session.account.role) {
        $modalInstance.close(session);
      }
      */

      session.accounts.some(function (a) {
        if (a.id === session.selectedAccountId) {
          account =  a;
        }
      });

      if (session.login.emails) {
        scope.delta.email = session.login.emails[0] || {};
        scope.delta.email = scope.delta.email.value;
      }

      Object.keys(session.account).forEach(function (field) {
        scope.account[field] = session.account[field];
      });
    }
    init(mySession);
    StSession.subscribe(init, $scope);

    scope.updateAccount = function () {
      console.log('update account');
      console.log(scope.delta);
      return StAccount.update(mySession.selectedAccountId, scope.delta).then(function (session) {
        console.log('UPDATE 1');
        console.log(session);
        /*
        var account = session && session.account
          ;

        if (!account || !account.id || account.error) {
          console.error('ERROR updating account');
          console.error(account);
          return;
        }

        // TODO do these account adjustments in StSession
        if (!mySession.accounts.some(function (a) {
          return a.id === account.id;
        })) {
          mySession.accounts.push(account);
        }
        mySession.selectedAccountId = account.id;
        */

        // TODO could probably just update the session in this scope
        // instead of using StSession.update to broacast
        StSession.update(session);

        $modalInstance.close(session);

        return session;
      });
    };
  });
