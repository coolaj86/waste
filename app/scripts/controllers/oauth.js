'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:OauthCtrl
 * @description
 * # OauthCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('OauthCtrl', function ($scope, $http, $stateParams, StSession, StApi) {
    var scope = this
      ;

    // Convert all scope changes back to a scope string
    scope.updateScope = function () {
      var accepted = scope.deltaScope
        ;

      if (true === scope.selectedAccount.new) {
        scope.selectedAccount = scope.previousAccount;
        setTimeout(function () {
          window.alert("this feature is not yet implemented");
        }, 0);
        return;
      }
      scope.previousAccount = scope.selectedAccount;


      scope.selectedAccountId =
        scope.selectedAccount.id || scope.selectedAccount.uuid;

      // TODO check for allow / deny
      scope.acceptedScope = scope.requestedScopeString;

      /*
      Object.keys(accepted).filter(function (k) {
        var s = accepted[k]
          ;

        return s.accepted;
      }).map(function (k) {
        var s = accepted[k]
          ;

        return s.group + ':' + s.readable.join(',') + ':' + s.writeable.join(',') + ':' + s.executable.join(',');
      }).join(' ');
      */

      console.log('scope.acceptedScope', scope.acceptedScope);
      console.log('scope.selectedAccountId', scope.selectedAccountId);
      console.log('');
    };

    StSession.ensureSession(
      // role
      null
      // TODO login opts (these are hypothetical)
    , { close: false
      , options: ['login', 'create']
      , default: 'login'
      , includeAccount: true // show the account stuff when asking to create a login
      }
      // TODO account opts
    , { verify: ['email', 'phone']
      }
    ).then(function (session) {
      console.log('session');
      console.log(session);
      console.log('');

      // get token from url param
      scope.token = $stateParams.token;

      $http.get(StApi.oauthPrefix + '/scope/' + $stateParams.token).then(function (resp) {
        console.log('resp.data');
        console.log(resp.data);
        console.log('');

        scope.selectedAccount = session.account;
        scope.previousAccount = session.account;

        scope.accounts = session.accounts.slice(0);
        scope.accounts.push({
          displayName: 'Create New Account'
        , new: true
        });

        scope.accounts.forEach(function (acc, i) {
          if (!acc.displayName) {
            acc.displayName = 'Account #' + (i + 1);
          }
        });

        if (resp.data.error) {
          scope.error = resp.data.error;
          scope.rawResponse = resp.data;
          return;
        }
        if (!resp.data.requestedScope) {
          scope.error = { message: "missing scope request" };
          scope.rawResponse = resp.data;
          return;
        }

        scope.client = resp.data.client;
        if (!scope.client.title) {
          scope.client.title = scope.client.name || 'Missing App Title';
        }

        scope.invalids = resp.data.invalids;
        scope.requestedScopeString = resp.data.requestedScopeString;
        scope.deltaScope = resp.data.requestedScopeString.split(' ').map(function (str) {
          return { accepted: true, name: str };
        });
        scope.transactionId = resp.data.transactionId;

        scope.updateScope();
      });
    });
  });
