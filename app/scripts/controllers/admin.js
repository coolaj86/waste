'use strict';

angular.module('yololiumApp')
  .controller('AdminCtrl', ['$scope', '$http', 'mySession', function ($scope, $http, mySession) {
    var scope = this
      ;

    scope.session = mySession;
  }]);
