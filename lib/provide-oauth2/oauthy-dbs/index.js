'use strict';

exports.create = function (/*app, config, DB*/) {
  var dbs
    ;
    
  dbs = {
    permissions: require('./permissions')
    // TODO aren't these ephemeral and could just stay in memory?
  //, authorizationCodes: require('./authorizationcodes')
  };

  return dbs;
};
