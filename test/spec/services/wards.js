'use strict';

describe('Service: Wards', function () {

  // load the service's module
  beforeEach(module('ysawardsorgApp'));

  // instantiate service
  var Wards;
  beforeEach(inject(function (_Wards_) {
    Wards = _Wards_;
  }));

  it('should do something', function () {
    expect(!!Wards).toBe(true);
  });

});
