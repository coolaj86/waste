'use strict';

module.exports.init = function (ru, Auth) {
  // TODO rename to findOrCreateById
  Auth.Users.findById('local' + ':' + ru.id, function (user) {
    if (user.profile.secret) {
      //console.log(user);
      //console.log(ru);
      if (user.profile.salt === ru.salt || user.profile.secret === ru.secret) {
        console.warn("You should change your webapp root passphrase.");
        console.warn("run `./bin/generate-root-secret.js` and paste the results into config.js");
      }
      return;
    }

    user.profile.id = ru.id;
    user.profile.salt = ru.salt;
    user.profile.secret = ru.secret;
    user.profile.hashtype = ru.type;

    //Users.createByIdSync('local' + ':' + ru.id, ru);
    // Find existing account first
    Auth.Accounts.create(['local' + ':' + ru.id], { role: 'root' }, function (account) {
      Auth.Users.link('local' + ':' + ru.id, account.uuid, function () {
        console.log('created root user and account for root user');
      });
    });
  });
};

if (module === require.main) {
  var path = require('path')
    ;

  module.exports.init(
    require('../config').rootUser
  , require('./users').create({ dbfile: path.join(__dirname, '..', 'priv', 'users.priv.json') })
  , require('./accounts').create({ dbfile: path.join(__dirname, '..', 'priv', 'accounts.priv.json')})
  );
}
