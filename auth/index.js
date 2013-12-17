'use strict';

var Passport = require('passport').Passport
  , facebook = require('./facebook')
  , path = require('path')
  , Users = require('./users').create({ dbfile: path.join(__dirname, '..', 'data', 'users.priv.json') })
  , AccountLinks = require('./account-links').create({ dbfile: path.join(__dirname, '..', 'data', 'users-accounts.priv.json') })
  , Accounts = require('./accounts').create({ dbfile: path.join(__dirname, '..', 'data', 'accounts.priv.json')})
  ;

module.exports.init = function (app, config) {
  var passport = new Passport()
    , routes = []
    ;

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.  However, since this example does not
  //   have a database of user records, the complete Facebook profile is serialized
  //   and deserialized.
  passport.serializeUser(function(data, done) {
    var user
      ;

    console.log('serialize', data);
    user = Users.create(data.profile || data);
    console.log(user);
    done(null, user);
  });

  passport.deserializeUser(function (obj, done) {
    console.log('deserialize', obj);
    var user = Users.read(obj.profile || obj)
      , ids = []
      , accountIdMap = {}
      , accounts = []
      ;

    ids = AccountLinks.scrape(obj.profile || obj);
    if (0 === ids.length) {
      // TODO bad user account
      done(new Error("unrecognized account type"));
      return;
    }

    ids.forEach(function (id) {
      AccountLinks.find(id).forEach(function (accountId) {
        accountIdMap[accountId] = true;
      });
    });

    Object.keys(accountIdMap).forEach(function (accountId) {
      accounts.push(Accounts.find(accountId));
    });

    /*
    ids.forEach(function (id) {
      accounts.forEach(function (account) {
        AccountLinks.link(id, account.uuid);
      });
    });
    */

    //ids
    //accounts
    //Users.update(data, ids, Object.keys(accountIdMap));

    /*
    accounts.forEach(function (account) {
      AccountLinks.update(account.uuid, data);
      Accounts.update(account, data);
    });

    //done(null, { role: 'user', user: data, accounts: accounts });
    */
    if (0 === accounts.length) {
      accounts.push(Accounts.create(ids, user));
      ids.forEach(function (id) {
        AccountLinks.create(id, accounts[0].uuid);
      });
    }

    console.log(null, { role: 'user', user: user, accounts: accounts });
    done(null, user);
  });

  app
    .use(passport.initialize())
    .use(passport.session())
    ;

  routes.push(facebook.init(passport, config));

  return routes;
};
