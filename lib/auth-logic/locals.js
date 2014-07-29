'use strict';

var authutils = require('./utils-auth')
  ;

module.exports.create = function (Logins) {
  // TODO let the local login be like facebook connect (with an associated profile? ...prolly not)
  // such that even local logins are over oauth2
  function LocalLogin() {
  }
  LocalLogin.get = function (auth) {
    return auth.__login || Logins.get({ type: 'local', uid: auth.uid || auth.id }).then(function (login) {
      auth.__login = login;
      return login;
    });
  };
  LocalLogin.getOrNull = function (auth) {
    return LocalLogin.get(auth).then(function (login) {
      if (!login) {
        return null;
        //throw new Error('login not found');
      }
    });
  };
  LocalLogin.loginOrCreate = function (auth) {
    // The default behaviour is to try to login
    // and create an account if the user does not exist
    return LocalLogin.login(auth).then(function (login) {
      return login;
    }, function () {
      return LocalLogin.realCreate(auth);
    });
  };
  LocalLogin.create = LocalLogin.loginOrCreate;
  LocalLogin.realCreate = function (auth) {
    //console.log('!!!!!!!!!!!!!!!!!!');
    //console.log(auth);
    var creds = authutils.createShadow(auth.secret)
      ;
    //console.log(creds);

    if (!(auth.secret && auth.secret.length >= 8)) {
      // TODO move rules elsewhere (function in config? should be async)
      throw new Error('Must have a secret at least 8 characters long to create an account');
    }

    // will fail if user exists
    return Logins.create({
      uid: auth.uid || auth.id
    , type: 'local'
    , hashid: Logins.getHashid(auth)
    , shadow: creds.shadow
    , salt: creds.salt
    , hashtype: creds.hashtype
    , public: auth.public || {}
    });
  };
  LocalLogin.login = function (auth) {
    return LocalLogin.getOrNull(auth).then(function (login) {
      if (!login) {
        return null;
      }

      var valid
        ;
        
      valid = authutils.testSecret(
        login.get('salt')
      , auth.secret
      , login.get('shadow') // hashed version
      , login.get('hashtype')
      );

      if (!valid || !auth.secret) {
        throw new Error('invalid secret');
      }

      return Logins.login(login);
    });
  };

  return LocalLogin;
};
