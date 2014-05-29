'use strict';

angular.module('yololiumApp')
  .controller('UserCtrl', function ($scope, mySession) {
    var scope = this
      ;

    scope.session = mySession;
  });
