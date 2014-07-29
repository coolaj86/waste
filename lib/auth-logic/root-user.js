'use strict';

module.exports.init = function (ru, Auth) {
  var loginObj
    ;

  loginObj = {
    type: 'local'
  , uid: ru.uid
  , salt: ru.salt
  , secret: ru.secret
  , hashtype: ru.hashtype
  , provider: 'local'
  };

  ru.login = ru.login || {};

  // TODO rename to findOrCreateById
  return Auth.Logins.login(loginObj).then(function (login) {
    login.set('uid', ru.uid);
    login.set('salt', ru.salt);
    login.set('secret', ru.secret);
    login.set('hashtype', ru.hashtype);

    Object.keys(ru.login).forEach(function (k) {
      login.set(k, ru.login[k]);
    });

    if (login.hasChanged()) {
      return login.save();
    }

    return login;
  }).then(function (login) {
    // Find existing account first
    if (login.related('accounts').length) {
      return login;
    }

    return Auth.Accounts.create(ru.account || { role: 'root' }, function (account) {
      return Auth.Logins.linkAccounts(login, account).then(function () {
        return Auth.Logins.setPrimaryAccount(login, account).then(function () {
          console.log('[root-user] created account');
        });
      });
    });
  }).then(function () {
    console.log('[root-user] ensured login and account for \'' + ru.uid + '\'');
  }, function (err) {
    console.error('[ERROR] [root-user]');
    console.error(err);
  });
};
