'use strict';

var recase = require('recase').Recase.create({ exceptions: {} })
  ;

module.exports.parse = function (json) {
  var profile = {}
    , account
    ;

  json = recase.camelCopy(json);
  console.log('[passport-loopback] json');
  console.log(json);
  json.accounts.forEach(function (acc) {
    if (json.selectedAccountId === (acc.id || acc.uuid)) {
      account = acc;
    }
  });
  profile.id = account.id || account.uuid;
  Object.keys(account).forEach(function (key) {
    profile[key] = account[key];
  });
  delete profile.uuid;
  profile.displayName = account.name || account.displayName;
  profile.emails = json.emails || [];
  profile.photos = json.photos || [];

  return profile;
};
