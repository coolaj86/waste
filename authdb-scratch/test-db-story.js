'use strict';

var UUID = require('node-uuid')
  , authutils = require('./lib/utils-auth')
  //, Promise = require('bluebird').Promise
  ;


function createAccounts(DB) {
  function Accounts() {
  }

  Accounts.create = function (stuff) {
    var account
      ;

    if (stuff.uuid) {
      throw new Error('uuids are assigned by the accounts, not by you');
    }
    account = DB.Accounts.forge(stuff);

    return account.save({ uuid: UUID.v4() }, { method: 'insert' });
  };

  Accounts.linkLogins = function (accounts, logins) {
    if (!accounts) {
      throw new Error('missing accounts to link');
    }

    if (!Array.isArray(accounts)) {
      accounts = [accounts];
    }

    if (!logins) {
      throw new Error('missing logins to link');
    }

    if (!Array.isArray(logins)) {
      logins = [logins];
    }

    // TODO loop through accounts and attach logins to them
    throw new Error('Not Implemented: Accounts.linkLogins()');
  };

  Accounts.linkLogins = function (accounts, logins) {
    throw new Error('Not Implemented: Accounts.unlinkLogins()');
  };

  return Accounts;
}
module.exports.run = function (Db) {
  var mocks = {}
    , Logins = require('./logins').create(Db)
    , Accounts = createAccounts(Db)
    ;

  // See Story at https://github.com/coolaj86/angular-project-template/issues/8

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
    console.log('!!!!!!!!!!!!!!!!!!');
    console.log(auth);
    var creds = authutils.createSecretHash(auth.secret)
      ;
    console.log(creds);

    // TODO length restrictions
    if (!(auth.secret && auth.secret.length >= 8)) {
      throw new Error('Must have a secret at least 8 characters long to create an account');
    }

    // will fail if user exists
    return Logins.create({
      uid: auth.uid
    , type: auth.type
    , typedUid: Logins.getTypedUid(auth)
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


  // I login with facebook
  function loginWithFacebook(profile) {
    // TODO public / private profile info
    var loginObj = { public: profile }
      ;

    loginObj.type = 'facebook';
    loginObj.uid = loginObj.public.id;

    // TODO every login needs a mergeUpdates hook
    return Logins.login(loginObj)
      .then(function (login) {
        var pub
          ;

        // Update profile with updated data
        pub = login.get('public') || {};
        login.set('public', pub);
        console.log(login.changed);
        console.log(login.attributes);
        loginObj.public = loginObj.public || {};
        login.get('public')
        Object.keys(loginObj.public).forEach(function (key) {
          pub[key] = loginObj.public[key];
        });
        // TODO and oauth token, which is not in public
        console.log(login.attributes);

        if (!login.hasChanged()) {
          console.log('[fb] profile has not changed');
          return login;
        }

        console.log('[fb] profile updated');
        console.log(login.changed);
        return login.save().then(function (data) {
          console.log('[fb] saved updates');
          return data;
        });
      });
  }

  // I login with twitter
  function loginWithTwitter(profile) {
    // TODO public / private profile info
    var loginObj = { public: profile }
      ;

    loginObj.type = 'twitter';
    loginObj.uid = loginObj.public.id;

    // TODO every login needs a mergeUpdates hook
    return Logins.login(loginObj)
      .then(function (login) {
        // Update profile with updated data
        loginObj.public = loginObj.public || {};
        Object.keys(loginObj.public).forEach(function (key) {
          login.set(key, loginObj.public[key]);
        });

        if (!login.hasChanged()) {
          console.log('[tw] profile has not changed');
          return login;
        }

        console.log('[tw] profile updated');
        return login.save().then(function (data) {
          console.log('[tw] saved updates');
          return data;
        });
      });
  }

  mocks.fbProfile = require('./profile.fb.json');
  mocks.twProfile = require('./profile.tw.json');

  // I log in with facebook
  loginWithFacebook(mocks.fbProfile).then(function (fbLogin) {
    console.log('a');
    if (fbLogin.related('accounts').length) {
      console.log('has an account');
      return [fbLogin];
    }
    console.log('b');

    // I don't have an account, so I create one
    return LocalLogin.create({ uid: 'coolaj86', secret: 'sauce' }).then(function (localLogin) {
      var logins = [fbLogin, localLogin]
        ;

      // TODO we'll test which logins exist in the local session before we allow linking
      return Accounts.create({
        name: fbLogin.name
        // TODO sometimes a facebook account is unverified and therefore the email doesn't show up
      , email: fbLogin.emails[0].value
      }).then(function (account) {
        return account.attach(logins).then(function () {
          return logins;
        });
      });
    });
  }).then(function () {
    loginWithTwitter(mocks.twProfile);
    // I login some other time with other credentials
    //public: mocks.fbProfile
  });
};
