'use strict';

describe('Service: StAccount', function () {

  // load the service's module
  beforeEach(module('yololiumApp'));

  // instantiate service
  var StAccount;
  beforeEach(inject(function (_StAccount_) {
    StAccount = _StAccount_;
  }));

  it('should do something', function () {
    expect(!!StAccount).toBe(true);
  });

});
