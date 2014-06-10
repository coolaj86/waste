'use strict';

var UUID = require('node-uuid')
  , fs = require('fs')
  //, serverConfig = require('../config')
  , secretUtils = require('../sessionlogic/utils')
  ;

function createUser(type, uid) {
  var loginId = type + ':' + uid
    ;

  return {
    typedUid: loginId
  , id: loginId
  , type: type
  , uid: uid
  , accountIds: []
  , primaryAccountId: null
  , profile: {}
  , xattrs: {}
  , createdAt: Date.now()
  , updatedAt: Date.now()
  , touchedAt: Date.now()
  // TODO things to remove at some future point
  , fkey: uid
  , created: Date.now()
  , uuid: UUID.v4() // TODO ditch uuid
  };
}

module.exports.Users = {};
module.exports.Users.create = function (opts) {
  var Users = {}
    , users
    , dbpath = opts.dbfile
    , db
    ;

  try {
    users = require(opts.dbfile);
  } catch(e) {
    console.log("Couldn't find users db file '" + opts.dbfile + "'. Creating anew...");
    users = {};
  }

  Users.save = function (login) {
    if (false) {
      db.put(login);
    } else {
      // TODO check log and reduce number of saves
      //console.log('saving users db file', dbpath);
      fs.writeFileSync(dbpath, JSON.stringify(users, null, '  '), 'utf8');
    }
  };

  Users.exists = function (id, cb) {
    cb(!!users[id]);
  };
  Users.attachAccount = function (login, account, cb) {
    if (!login.primaryAccountId) {
      Users.setPrimaryAccount(login, account, cb);
      return;
    }

    if (-1 === login.accountIds.indexOf(account.id)) {
      login.accountIds.push(account.id);
    }

    Users.save(login);
  };
  Users.setPrimaryAccount = function (login, account, cb) {
    if (login.primaryAccountId === account.id) {
      if (cb) { cb(); }
      return;
    }

    login.primaryAccountId = account.id;
    if (-1 === login.accountIds.indexOf(account.id)) {
      login.accountIds.push(account.id);
    }

    Users.save(login);
    if (cb) { cb(); }
  };

  Users.readByIdAndSecret = function (type, loginId, secret, cb) {
    var user = users[type + ':' + loginId]
      ;

    if (!user) {
      cb(null, null);
      return;
    }

    if (!secretUtils.testSecretHash(user.salt, secret, user.secret, user.hashtype)) {
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

    user = createUser(type, uid);
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
    if (!users[loginId]) {
      Users.createByIdSync(loginId);
    }
    cb(users[loginId]);
  };

  Users.set = function (providerType, id, user, cb) {
    users[providerType + ':' + id] = user;
    user.accountIds = user.accountIds || [];

    Users.save(user);
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

  UsersWrapper.exists = Users.exists;

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

    if (-1 === user.accountIds.indexOf(accountId)) {
      user.accountIds.push(accountId);
    }

    Users.save(user);
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
      login.accountIds = login.accountIds || [];
      Users.set(login.type, login.uid, l || login, function () {
        cb(null, login.id);
      });
    });
  };
  Users.create = function (getId, providerType, login, cb) {
    getId(login.profile, function (err, uid) {
      Users.get(providerType + ':' + uid, function (existing) {
        var newUser = createUser(providerType, uid)
          ;

        if (existing) {
          // uuid, accounts, id
          // twitter's authorized
          // TODO create callback for merging new / old data
          Object.keys(existing).forEach(function (key) {
            // don't overwrite the new stuff
            if (!login.hasOwnProperty(key) && existing.hasOwnProperty(key)) {
              login[key] = existing[key];
            }
          });
        }

        if (!login.typedId) {
          login.id = login.type + ':' + uid;
          login.typedId = login.type + ':' + uid;
        }

        Object.keys(newUser).forEach(function (k) {
          if (!login.hasOwnProperty(k)) {
            login[k] = newUser[k];
          }
        });

        Users.set(providerType, uid, login, function () {
          cb(login);
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

  UsersWrapper.setPrimaryAccount = Users.setPrimaryAccount;
  UsersWrapper.read = function (obj, cb) {
    var mod = mods[obj.type]
      ;

    if (!mod) {
      cb(null);
    }

    //Users.read(mod.getId, obj.type + ':', obj, cb);
    Users.read(mod.getId, obj.type, obj, cb);
  };
  UsersWrapper.attachAccount = Users.attachAccount;
  UsersWrapper.find = UsersWrapper.read;
  Users.read = function (getId, providerType, data, cb) {
    getId(data.profile, function (err, fkey) {
      Users.get(providerType + ':' + fkey, cb);
    });
  };

  return UsersWrapper;
};
