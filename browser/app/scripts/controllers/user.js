'use strict';

angular.module('yololiumApp')
  .controller('UserCtrl', ['mySession', function (mySession) {
    var scope = this
      ;

    scope.session = mySession;
  }]);
