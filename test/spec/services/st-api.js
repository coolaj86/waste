'use strict';

describe('Service: StApi', function () {

  // load the service's module
  beforeEach(module('yololiumApp'));

  // instantiate service
  var StApi;
  beforeEach(inject(function (_StApi_) {
    StApi = _StApi_;
  }));

  it('should do something', function () {
    expect(!!StApi).toBe(true);
  });

});
