'use strict';

angular.module('sortinghatApp')
  .controller('AdminCtrl', function ($scope, mySession) {
    var scope = this
      ;

    scope.session = mySession;
  });
