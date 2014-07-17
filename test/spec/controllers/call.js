'use strict';

describe('Controller: CallCtrl', function () {

  // load the controller's module
  beforeEach(module('yololiumApp'));

  var CallCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CallCtrl = $controller('CallCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
