'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:CallCtrl
 * @description
 * # CallCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('CallCtrl', ['$http', 'mySession', function ($http, mySession) {
    var scope = this
      ;

    console.log('[dial] mySession');
    console.log(mySession);
    console.log(mySession.account.role);
    console.log(['admin', 'root'].indexOf(mySession.account.role));
    if (!mySession || !mySession.account || -1 === ['admin', 'root'].indexOf(mySession.account.role)) {
      //window.alert('Only admins may use this page');
      //return;
    }

    scope.phone = '';
    scope.addDigit = function (digit) {
      console.log('addDigit');
      scope.phone += '' + digit; 
    };
    scope.dial = function (number) {
      console.log('Dial');
      $http.post('/api/twilio/dial', { phone: number })
        .then(
          function () {
            window.alert('Dialing ' + number + '...');
          }
        , function (err) {
            console.error(err);
            window.alert('Failed to dial ' + number);
          }
        );
    };
  }]);
