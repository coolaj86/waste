'use strict';

var UUID = require('node-uuid')
  , authutils = require('./lib/utils-auth')
  , Promise = require('bluebird').Promise
  ;

module.exports.run = function (Db) {
  var mocks = {}
    , Logins = require('./logins').create(Db)
    , Accounts = require('./accounts').create(Db)
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
        login.get('public');
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
        var pub
          ;

        // Update profile with updated data
        pub = login.get('public') || {};
        login.set('public', pub);
        console.log(login.changed);
        console.log(login.attributes);
        loginObj.public = loginObj.public || {};
        login.get('public');
        Object.keys(loginObj.public).forEach(function (key) {
          pub[key] = loginObj.public[key];
        });
        // TODO and oauth token, which is not in public
        console.log(login.attributes);

        if (!login.hasChanged()) {
          console.log('[tw] profile has not changed');
          return login;
        }

        console.log('[tw] profile updated');
        console.log(login.changed);
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
      console.log('fbLogin has an account');
      return [fbLogin];
    }
    console.log('b');

    // I don't have an account, so I create one
    return LocalLogin.create({ uid: 'coolaj86', secret: 'sauce123' }).then(function (localLogin) {
      var logins = [fbLogin, localLogin]
        ;

      // TODO we'll test which logins exist in the local session before we allow linking
      console.log(fbLogin.toJSON());
      return Accounts.create({
        name: fbLogin.get('public').name
        // TODO sometimes a facebook account is unverified and therefore the email doesn't show up
      , email: fbLogin.get('public').emails[0].value
      }).then(function (account) {
        var ps = []
          ;

        account.related('logins').forEach(function (login) {
          var p
            ;

          // TODO also check that the account still exists
          if (login.get('primaryAccountId')) {
            return;
          }

          p = fbLogin.set('primaryAccountId', account.id).save();
          ps.push(p);
        });

        return Promise.all(ps).then(function () {
          return account.related('logins').attach(logins).then(function () {
            return logins;
          });
        });
      });
    });
  }).then(function () {
    console.log('[tw] login time');
    // I login some other time with new credentials (twitter)
    return loginWithTwitter(mocks.twProfile).then(function (twLogin) {
      console.log('[tw] got twLogin');
      // If the user has previous associated the account
      if (twLogin.related('accounts').length) {
        console.log('twLogin has an associated account');
        return [twLogin];
      }

      // If the user chooses to link with facebook
      console.log('[tw] needs to associate');
      return loginWithFacebook(mocks.fbProfile).then(function (fbLogin) {
        var account
          ;

        console.log('[tw] got fb login');
        fbLogin.related('accounts').some(function (_account) {
          if (_account.id === fbLogin.get('primaryAccountId')) {
            account = _account;
            return true;
          }
        });

        if (!account) {
          account = fbLogin.related('accounts')[0];
          // TODO set primary account
        }

        if (!account) {
          // TODO create account
          throw new Error('no associated account');
        }

        return twLogin.related('accounts').attach(account).then(function () {
          return Promise.all(
            twLogin.reset('accounts').load('accounts')
          , fbLogin.reset('accounts').load('accounts')
          ).then(function () {
            console.log('[tw] associated');
            return [twLogin, fbLogin];
          });
        });
      });
    });
  }).then(function (logins) {
    console.log('[fin] got a login with an account');
    var accountsMap = {}
      ;

    logins.forEach(function (login) {
      console.log('[fin] accounts in this login');
      console.log(login.related('accounts').length);
      login.related('accounts').forEach(function (account) {
        accountsMap[account.id] = account;
      });
    });

    // I am now logged in and have associated accounts
    console.log({
      accounts: Object.keys(accountsMap).map(function (id) { return accountsMap[id].toJSON(); })
    , logins: logins.map(function (login) { return login.toJSON(); })
    });
  });
};
