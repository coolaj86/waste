'use strict';

var UUID = require('node-uuid')
  ;

module.exports.create = function (LoginsBearer/*, LoginsApp*/) {
  // TODO create test users and tokens
  // (just like we create root)

  function BearerLogin() {
  }
  BearerLogin.get = function (auth) {
    return auth.__login || LoginsBearer.get({
      uid: auth.uid
    , appUid: auth.appUid
    }).then(function (login) {
      auth.__login = login;
      return login;
    });
  };
  BearerLogin.create = function (appUid, comment, account) {
    // this will always call the real create because UUID.v4() is always unique
    // TODO skip the extra lookup step and call realCreate directly
    return LoginsBearer.create({
      uid: UUID.v4()
    , appUid: appUid
    , comment: comment || 'Application Access Token '
        // TODO add a better random 8-char identifier
        + UUID.v4().substr(0, 10).replace(/-/, '').replace(/^(\d{4})(\d{4})*/, "$1-$2")
    })
    .then(function (login) {
      if (!account) {
        // TODO this would be an error
        return login;
      }
      return LoginsBearer.linkAccounts(login, account)
        .then(function () { // logins
          return login;
        });
    });
  };
  BearerLogin.login = function (auth) {
    return BearerLogin.get({
      uid: auth.uid
    , appUid: auth.appUid
    }).then(function (login) {
      if (!login) {
        return null;
      }

      return LoginsBearer.login(login);
    });
  };

  return BearerLogin;
};
