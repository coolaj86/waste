'use strict';

var UUID = require('node-uuid')
  , fs = require('fs')
  //, serverConfig = require('../config')
  , secretUtils = require('../utils')
  ;

module.exports.Users = {};
module.exports.Users.create = function (opts) {
  var Users = {}
    , users
    , dbpath = opts.dbfile
    ;

  try {
    users = require(opts.dbfile);
  } catch(e) {
    console.log("Couldn't find users db file '" + opts.dbfile + "'. Creating anew...");
    users = {};
  }

  Users.save = function () {
    // TODO check log and reduce number of saves
    //console.log('saving users db file', dbpath);
    fs.writeFileSync(dbpath, JSON.stringify(users, null, '  '), 'utf8');
  };

  Users.readByIdAndSecret = function (type, loginId, secret, cb) {
    var user = users[type + ':' + loginId]
      ;

    if (!user) {
      cb(null, null);
      return;
    }

    if (!secretUtils.testSecretHash(user.profile.salt, secret, user.profile.secret, user.profile.hashtype)) {
      cb(null, null);
      return;
    }

    cb(null, user);
  };

  Users.readByIdSync = function (loginId) {
    return users[loginId];
  };
  Users.createByIdSync = function (loginId) {
    var user
      , type = loginId.split(':')[0]
      , uid = loginId.split(':').slice(1).join(':')
      ;

    user = users[loginId];

    if (user) {
      return user;
    }

    user = {
      uuid: UUID.v4() // TODO ditch uuid
    , typedUid: loginId
    , id: loginId
    , type: type
    , uid: uid
    , fkey: uid
    , accounts: []
    , primaryAccountId: null
    , profile: {}
    , xattrs: {}
    , created: Date.now()
    //TODO, updated: Date.now()
    };
    users[loginId] = user;

    return users[loginId];
  };

  Users.mget = function (loginIds, cb) {
    var logins = []
      ;

    loginIds.forEach(function (loginId) {
      if (!users[loginId]) {
        Users.createByIdSync(loginId);
      }
      logins.push(users[loginId]);
    });

    cb(null, logins);
  };
  Users.getOnly = function (loginId, cb) {
    cb(null, users[loginId]);
  };
  Users.get = function (loginId, cb, opts) {
    opts = opts || {};
    if (!users[loginId] && opts.nocreate) {
      Users.createByIdSync(loginId);
    }
    cb(users[loginId]);
  };

  Users.set = function (providerType, id, user, cb) {
    users[providerType + ':' + id] = user;

    Users.save();
    if (cb) { cb(); }
  };

  //Users.all = users;
  return Users;
};

module.exports.create = function (opts) {
  var UsersWrapper = {}
    , mods = {}
    , Users = module.exports.Users.create(opts)
    ;


  UsersWrapper.register = function (type, ver, getId, getIds) {
    mods[type] = {};
    mods[type].getId = getId;
    mods[type].getIds = getIds;
  };

  Users.getIds = function (data) {
    var mod = mods[data.type]
      , ids = []
      ;

    if (!mod) {
      throw new Error('unregistered type:' + data.type);
    }

    mod.getIds(data.profile).forEach(function (id) {
      if ('email' === id.type) {
        id.value = id.value.toLowerCase();
      }

      ids.push(id.type + ':' + id.value);
    });

    return ids;
  };

  UsersWrapper.link = function (loginId, accountId, cb) {
    var user = Users.readByIdSync(loginId)
      ;

    if (!user) {
      user = Users.createByIdSync(loginId);
    }

    if (-1 === user.accounts.indexOf(accountId)) {
      user.accounts.push(accountId);
    }

    Users.save();
    if (cb) { cb(); }
  };

  UsersWrapper.readByIdAndSecret = Users.readByIdAndSecret;
  UsersWrapper.createByIdSync = Users.createByIdSync;
  UsersWrapper.findById = Users.get;
  UsersWrapper.mget = Users.mget;
  UsersWrapper.scrapeIds = Users.getIds;
  UsersWrapper.create = function (data, cb) {
    var mod = mods[data.type]
      ;

    if (!mod) {
      cb(null);
      return;
    }

    Users.create(mod.getId, data.type, data, cb);
  };
  UsersWrapper.upsert = function (login, cb) {
    Users.getOnly(login.id, function (err, l) {
      if (l) {
        // the practical use here is just to update the authorized field for twitter
        Object.keys(login).forEach(function (key) {
          l[key] = login[key];
        });
      }
      Users.set(login.type, login.uid, l || login, function () {
        cb(null, login.id);
      });
    });
  };
  Users.create = function (getId, providerType, data, cb) {
    getId(data.profile, function (err, fkey) {
      Users.get(providerType + ':' + fkey, function (loginProfile) {

        if (loginProfile) {
          // uuid, accounts, id
          // twitter's authorized
          // TODO create callback for merging new / old data
          Object.keys(loginProfile).forEach(function (key) {
            // don't overwrite the new stuff
            if (!data.hasOwnProperty(key)) {
              data[key] = loginProfile[key];
            }
          });
        }

        loginProfile = data;
        if (!loginProfile.uuid) {
          loginProfile.uuid = UUID.v4();
          loginProfile.id = data.type + ':' + data.fkey;
          loginProfile.accounts = [];
        }

        Users.set(providerType, fkey, loginProfile, function () {
          cb(loginProfile);
        });
      });
    });
  };

  UsersWrapper.getId = function (obj, cb) {
    var mod = mods[obj.type]
      ;

    if (!mod) {
      cb(null);
      return;
    }

    mod.getId(obj.profile, function (err, id) {
      cb(null, obj.type + ':' + id);
    });
  };

  UsersWrapper.read = function (obj, cb) {
    var mod = mods[obj.type]
      ;

    if (!mod) {
      cb(null);
    }

    //Users.read(mod.getId, obj.type + ':', obj, cb);
    Users.read(mod.getId, obj.type, obj, cb);
  };
  UsersWrapper.find = UsersWrapper.read;
  Users.read = function (getId, providerType, data, cb) {
    getId(data.profile, function (err, fkey) {
      Users.get(providerType + ':' + fkey, cb);
    });
  };

  return UsersWrapper;
};
