'use strict';

angular.module('yololiumApp')
  .controller('AdminCtrl', function ($scope, mySession) {
    var scope = this
      ;

    scope.session = mySession;
  });
