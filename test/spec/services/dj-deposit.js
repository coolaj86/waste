'use strict';

describe('Service: djDeposit', function () {

  // load the service's module
  beforeEach(module('yololiumApp'));

  // instantiate service
  var djDeposit;
  beforeEach(inject(function (_djDeposit_) {
    djDeposit = _djDeposit_;
  }));

  it('should do something', function () {
    expect(!!djDeposit).toBe(true);
  });

});
