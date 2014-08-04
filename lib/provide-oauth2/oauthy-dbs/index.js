'use strict';

exports.create = function (app, config/*, DB*/) {
  var dbs
    ;
    
  dbs = {
    users: require('./users').create(app, config)
  , consumers: require('./consumers').create(app, config)
  , permissions: require('./permissions')
  , accessTokens: require('./accesstokens')
    // TODO aren't these ephemeral?
  , authorizationCodes: require('./authorizationcodes')
  };

  return dbs;
};
