'use strict';

var UUID = require('node-uuid')
  ;

module.exports.create = function (LoginsBearer/*, LoginsApp*/) {
  // TODO create test users and tokens
  // (just like we create root)

  function BearerLogin() {
  }
  BearerLogin.get = function (auth) {
    console.log('[BearerLogin] get', auth);
    return auth.__login || LoginsBearer.get({
      uid: auth.uid
    }).then(function (login) {
      auth.__login = login;
      return login;
    });
  };
  BearerLogin.create = function (stuff, account) {
    console.log('[BearerLogin] create');
    console.log('appId:', stuff.appId);
    console.log('comment:', stuff.comment);
    console.log('account:', stuff.accountId);
    // this will always call the real create because UUID.v4() is always unique
    // TODO skip the extra lookup step and call realCreate directly
    return LoginsBearer.create({
      uid: stuff.uid || UUID.v4()
    , appId: stuff.appId
    , comment: stuff.comment || 'Application Access Token '
        // TODO add a better random 8-char identifier
        + UUID.v4().substr(0, 10).replace(/-/, '').replace(/^(\d{4})(\d{4})*/, "$1-$2")
    })
    .then(function (login) {
      if (!account) {
        console.error('[ERROR] [bearers] no account');
        console.error(stuff);
        // TODO this would be an error
        return login;
      }
      return LoginsBearer.linkAccounts(login, [account])
        .then(function () { // logins
          return login;
        });
    });
  };
  BearerLogin.login = function (auth) {
    console.log('[BearerLogin] login');
    console.log(auth);
    // will check for valid appId on re-entry
    return BearerLogin.get({
      uid: auth.uid
    }).then(function (login) {
      if (!login) {
        return null;
      }

      return LoginsBearer.login(login);
    });
  };

  return BearerLogin;
};
