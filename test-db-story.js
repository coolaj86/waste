'use strict';

var AM = require('./lib/bookshelf-models')
  , UUID = require('node-uuid')
  , mocks = {}
  ;

mocks.fbProfile = {
  uid: 'coolaj86'
, name: 'AJ ONeal'
, emails: [{ value: 'coolaj86@gmail.com' }]
};

// See Story at https://github.com/coolaj86/angular-project-template/issues/8

function hasChanged(model) {
  return 0 !== Object.keys(model.changed).length;
}

// I login with facebook
function loginWithFacebook(fb) {
  var query
    ;

  fb.type = 'facebook';
  fb.typedUid = fb.type + ':' + fb.uid;

  query = { typedUid: fb.typedUid };
  console.log(query);
  new AM.Logins(query)
    .fetch() //{ withRelated: ['accounts'] })
    .then(function (login) {
      if (!login) {
        console.log('NO LOGIN !!!!!!!!!!!!!!!!!!!!!!!!');
        createAccountWithFacebook(fb);
        return;
      }
      console.log('has login');
      console.log('changed?', login.changed);

      // Update profile with updated data
      Object.keys(fb).forEach(function (key) {
        login.set(key, fb[key]);
      });
      console.log('changed?', login.changed);

      console.log('heyo', login.id, login.isNew(), login.toJSON());
      if (!hasChanged(login)) {
        console.log('[noop] facebook is the same');
        return;
      }
      login.save().then(function (data) {
        console.log('[updated] facebook login', data.toJSON());
      }, function (err) {
        console.error('[1]');
        console.error(err);
      });
    }, function (err) {
      console.error('[0]');
      console.error(err);
    });
}

function createAccountWithFacebook(fb) {
  var account
    , login
    ;

  console.log('create fb account');
  account = new AM.Accounts({
    name: fb.name
  , email: fb.emails[0].value
  });
  /*
  account = AM.Accounts().forge({
    uuid: UUID.v4()
  , name: fb.name
  , email: fb.emails[0].value
  });
  */
  console.log('create fb login');
  login = new AM.Logins();

  account.save({ uuid: UUID.v4() }).then(function () {
    // TODO why need to save before attaching?
    login.save(fb).then(function (login) {
      login.accounts().attach(account);
      login.load(['accounts']).then(function (login) {
          login.accounts().attach(account);

          login
            .save()
            .then(function (login) {
              login
                .load(['accounts'])
                .then(function () {
                  console.log('[new] facebook login');
                  console.log(JSON.stringify(login.toJSON(), null, '  '));
                }, function (err) {
                  console.error('[4]');
                  console.error(err);
                });
            }, function (err) {
              console.error('[3]');
              console.error(err);
            });
        });
    });
  }, function (err) {
    console.error('[2]');
    console.error(err);
  });
}

loginWithFacebook(mocks.fbProfile);
