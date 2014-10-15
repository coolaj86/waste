'use strict';

angular.module('yololiumApp')
  .controller('AlertCtrl', ['$modalInstance', 'myOptions', function ($modalInstance, myOptions) {
    var scope = this
      ;

    console.log('Alert options', myOptions);

    scope.confirm = myOptions.confirm || false;

    scope.title = myOptions.title || 'Alert';
    scope.message = myOptions.message || '';

    scope.okLabel = myOptions.okLabel || 'OK';
    scope.confirmLabel = myOptions.confirmLabel || 'Confirm';
    scope.cancelLabel = myOptions.cancelLabel || 'Cancel';

    scope.resolve = function () {
      console.log('modalInstance.close');
      $modalInstance.close();
    };

    scope.reject = function () {
      console.log('modalInstance.dismiss');
      $modalInstance.dismiss();
    };
  }]);
