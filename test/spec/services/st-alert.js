'use strict';

describe('Service: stAlert', function () {

  // load the service's module
  beforeEach(module('yololiumApp'));

  // instantiate service
  var stAlert;
  beforeEach(inject(function (_stAlert_) {
    stAlert = _stAlert_;
  }));

  it('should do something', function () {
    expect(!!stAlert).toBe(true);
  });

});
