'use strict';

angular.module('yololiumApp')
  .controller('AccountNewCtrl', function ($http, $modalInstance, StAccount, mySession) {
    var scope = this
      , required = ['localLoginId']
      , account = { loginIds: [] }
      ;

    scope.accountAction = scope.accountAction || 'create';
    scope.account = {};
    scope.delta = {};

    /*
    if ('guest' === mySession.account.role) {
      $modalInstance.close(mySession);
    }
    */

    mySession.accounts.some(function (a) {
      if (a.id === mySession.selectedAccountId) {
        account =  a;
      }
    });

    if (mySession.login.emails) {
      scope.delta.email = mySession.login.emails[0] || {};
      scope.delta.email = scope.delta.email.value;
    }

    account.loginIds.some(function (l) {
      // TODO send more detailed info about logins with each account
      if (/^local:/.test(l)) {
        account.localLoginId = l;
      }
    });

    function hasField(field) {
      scope.account[field] = mySession.account[field];
      return mySession.account[field];
    }

    if (required.every(hasField)) {
      $modalInstance.close(mySession);
    }

    scope.updateAccount = function () {
      console.log('update account');
      console.log(scope.delta);
      StAccount.update(mySession.selectedAccountId, scope.delta).then(function (account) {
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
        $modalInstance.close(mySession);
      });
    };

    //
    // Modal
    //
    scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
