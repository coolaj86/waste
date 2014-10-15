'use strict';

describe('Controller: PushCtrl', function () {

  // load the controller's module
  beforeEach(module('yololiumApp'));

  var PushCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    PushCtrl = $controller('PushCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
