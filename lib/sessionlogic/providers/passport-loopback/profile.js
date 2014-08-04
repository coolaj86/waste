'use strict';

module.exports.parse = function (json) {
  var profile = {}
    ;

  profile.id = json.id || json.hashid || json.uid;
  profile.displayName = json.name || json.uid;
  profile.emails = json.emails || [];
  profile.photos = json.photos || [];

  return profile;
};
