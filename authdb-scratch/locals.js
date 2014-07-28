'use strict';

var authutils = require('./lib/utils-auth')
  ;

module.exports.create = function (Logins) {
  // TODO let the local login be like facebook connect (with an associated profile? ...prolly not)
  // such that even local logins are over oauth2
  function LocalLogin() {
  }
  LocalLogin.get = function (auth) {
    auth.type = 'local';
    return auth.__login || Logins.get(auth).then(function (login) {
      auth.__login = login;
      return login;
    });
  };
  LocalLogin.getOrError = function (auth) {
    return LocalLogin.get(auth).then(function (login) {
      if (!login) {
        throw new Error('login not found');
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
    var creds = authutils.createSecretHash(auth.secret)
      ;
    //console.log(creds);

    // TODO length restrictions
    if (!(auth.secret && auth.secret.length >= 8)) {
      throw new Error('Must have a secret at least 8 characters long to create an account');
    }

    // will fail if user exists
    return Logins.create({
      uid: auth.uid
    , type: auth.type
    , hashid: Logins.getHashid(auth)
    , secret: creds.secret
    , salt: creds.salt
    , hashType: creds.hashType
    });
  };
  LocalLogin.login = function (auth) {
    return LocalLogin.getOrError(auth).then(function (login) {
      var valid
        ;
        
      valid = authutils.testSecret(
        login.get('salt')
      , auth.secret
      , login.get('secret') // hashed version
      , login.get('hashType')
      );

      if (!valid || !auth.secret) {
        throw new Error('invalid secret');
      }

      return Logins.login(login);
    });
  };

  return LocalLogin;
};
