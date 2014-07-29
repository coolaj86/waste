'use strict';

var UUID = require('node-uuid')
  ;

module.exports.create = function (Logins) {
  // TODO create test users and tokens
  // (just like we create root)

  function BearerLogin() {
  }
  BearerLogin.get = function (auth) {
    return auth.__login || Logins.get({ type: 'bearer', uid: auth.uid }).then(function (login) {
      auth.__login = login;
      return login;
    });
  };
  BearerLogin.create = function (comment, account) {
    // this will always call the real create because UUID.v4() is always unique
    // TODO skip the extra lookup step and call realCreate directly
    return Logins.create({
      uid: UUID.v4()
    , type: 'bearer'
    , comment: comment || 'Application Access Token '
        // TODO add a better random 8-char identifier
        + UUID.v4().substr(0, 10).replace(/-/, '').replace(/^(\d{4})(\d{4})*/, "$1-$2")
    }).then(function (login) {
      return Logins.linkAccounts(login, account)
        .then(function (/*logins*/) {
          return login;
        });
    });
  };
  BearerLogin.login = function (auth) {
    return BearerLogin.getOrNull(auth).then(function (login) {
      if (!login) {
        return null;
      }

      return Logins.login(login);
    });
  };

  return BearerLogin;
};
