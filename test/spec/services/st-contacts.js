'use strict';

describe('Service: StContacts', function () {

  // load the service's module
  beforeEach(module('yololiumApp'));

  // instantiate service
  var StContacts;
  beforeEach(inject(function (_StContacts_) {
    StContacts = _StContacts_;
  }));

  it('should do something', function () {
    expect(!!StContacts).toBe(true);
  });

});
