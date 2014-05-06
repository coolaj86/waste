'use strict';

angular.module('sortinghatApp')
  .controller('UserCtrl', function ($scope, mySession) {
    var scope = this
      ;

    scope.session = mySession;
  });
