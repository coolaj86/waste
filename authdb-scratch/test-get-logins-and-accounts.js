'use strict';

module.exports.run = function (Db) {
  var mocks = {}
    , Logins = require('./logins').create(Db)
    ;

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
        return login;
      });
  }

  mocks.fbProfile = require('./profile.fb.json');

  // I log in with facebook
  loginWithFacebook(mocks.fbProfile).then(function (fbLogin) {
    console.log("login.related('accounts')");
    console.log(fbLogin.related('accounts'));
  });
};
