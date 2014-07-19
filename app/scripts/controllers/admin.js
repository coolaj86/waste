'use strict';

angular.module('yololiumApp')
  .controller('AdminCtrl', function ($scope, $http, mySession) {
    var scope = this
      ;

    scope.session = mySession;
  });
