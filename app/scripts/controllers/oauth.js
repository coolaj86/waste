'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:OauthCtrl
 * @description
 * # OauthCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('OauthCtrl', [ 
    '$window'
  , '$scope'
  , '$http'
  , '$stateParams'
  , 'StSession'
  , 'StApi'
  , function (
      $window
    , $scope
    , $http
    , $stateParams
    , StSession
    , StApi
    ) {
    var scope = this
      ;

    // Convert all scope changes back to a scope string
    scope.updateScope = function () {
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

      if (scope.selectedAccountId === scope.previousAccount.id) {
        return;
      }

      selectAccount(scope.selectedAccountId).then(function (/*txdata*/) {
        var accepted = scope.deltaScope
          ;

        // TODO check for allow / deny
        scope.acceptedScope = scope.deltaScopeString;

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
      });
    };

    function selectAccount(accountId) {
      return $http.get(
        StApi.oauthPrefix
      + '/scope/' + $stateParams.token
      + '?account=' +  accountId
      ).then(function (resp) {
        if (resp.data.error) {
          console.error('resp.data');
          console.error(resp.data);
          scope.error = resp.data.error;
          scope.rawResponse = resp.data;
          return;
        }

        if ('string' !== typeof resp.data.deltaScopeString) {
          console.error('resp.data');
          console.error(resp.data);
          scope.error = { message: "missing scope request" };
          scope.rawResponse = resp.data;

          return;
        }

        return resp.data;
      }).then(function (txdata) {
        scope.client = txdata.client;

        if (!scope.client.title) {
          scope.client.title = scope.client.name || 'Missing App Title';
        }

        scope.grantedScopeString = txdata.grantedScopeString;
        scope.requestedScopeString = txdata.requestedScopeString;
        scope.deltaScopeString = txdata.deltaScopeString;

        if (scope.deltaScopeString) {
          scope.deltaScope = txdata.deltaScopeString.split(' ').map(function (str) {
            return { accepted: true, name: str };
          });
        } else if ('string' === typeof scope.grantedScopeString) {
          // TODO submit form with getElementById or whatever
          setTimeout(function () {
            // NOTE needs time for angular to set transactionId
            if (!$window._gone) {
              $window.jQuery('#oauth-hack-submit').submit();
              $window._gone = true;
            }
          }, 50);
        }

        return txdata;
      });
    }

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

      selectAccount(session.account.id).then(function (txdata) {
        scope.transactionId = txdata.transactionId;

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

        scope.selectedAccount = session.account;
        scope.previousAccount = session.account;
        scope.updateScope();
      });
    });
  }]);
