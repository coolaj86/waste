'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:TransactionCtrl
 * @description
 * # TransactionCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('TransactionCtrl', ['$modalInstance', 'mySession', 'transactionData', function ($modalInstance, mySession, transactionData) {
    var T = this
      ;

    console.log('transactionData');
    console.log(transactionData);
    T.title = transactionData.title + " $" + (transactionData.amount/100).toFixed(2);
    if (transactionData.period) {
      T.title += "/" + transactionData.period;
    }

    T.confirm = function () {
      $modalInstance.close(transactionData);
    };
    T.cancel = function () {
      $modalInstance.dismiss({ ignore: true });
    };
  }]);
