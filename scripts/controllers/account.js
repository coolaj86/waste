'use strict';

angular.module('sortinghatApp')
  .controller('AccountCtrl', function (mySession) {
    var $scope = this
      ;

    $scope.profile = mySession;
  });
