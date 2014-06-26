'use strict';

describe('Service: stripe', function () {

  // load the service's module
  beforeEach(module('yololiumApp'));

  // instantiate service
  var stripe;
  beforeEach(inject(function (_stripe_) {
    stripe = _stripe_;
  }));

  it('should do something', function () {
    expect(!!stripe).toBe(true);
  });

});
