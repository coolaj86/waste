'use strict';

var UUID = require('node-uuid')
  , fs = require('fs')
  ;

module.exports.create = function (opts) {
  var Users = {}
    , dbpath = opts.dbfile
    , mods = {}
    , users
    ;

  try {
    users = require(opts.dbfile);
  } catch(e) {
    console.log("Couldn't find users db file. Creating anew...");
    users = {};
  }

  function save() {
    fs.writeFileSync(dbpath, JSON.stringify(users, null, '  '), 'utf8');
  }

  Users.all = users;

  Users.register = function (type, ver, getId, getIds) {
    mods[type] = {};
    mods[type].getId = getId;
    mods[type].getIds = getIds;
  };

  Users._readByIdSync = function (loginId) {
    return users[loginId];
  };
  Users._createByIdSync = function (loginId) {
    if (users[loginId]) {
      return users[loginId];
    }

    users[loginId] = {
      uuid: UUID.v4()
    , accounts: []
    , type: loginId.split(':')[0]
    , id: loginId
    , fkey: loginId.split(':').slice(1).join(':')
    , profile: {}
    };

    return users[loginId];
  };

  Users.link = function (loginId, accountId, cb) {
    var user = Users._readByIdSync(loginId)
      ;

    if (!user) {
      user = Users._createByIdSync(loginId);
    }

    if (-1 === user.accounts.indexOf(accountId)) {
      user.accounts.push(accountId);
    }

    save();
    if (cb) { cb(); }
  };

  Users._get = function (loginId, cb) {
    if (!users[loginId]) {
      Users._createByIdSync(loginId);
    }
    cb(users[loginId]);
  };
  Users.findById = Users._get;

  Users._getIds = function (data) {
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
  Users.scrapeIds = Users._getIds;

  Users._set = function (id, user, cb) {
    users[id] = user;

    save();
    if (cb) { cb(); }
  };

  Users.create = function (data, cb) {
    var mod = mods[data.type]
      ;

    if (!mod) {
      cb(null);
      return;
    }

    Users._create(mod.getId, data.type + ':', data, cb);
  };
  Users._create = function (getId, prefix, data, cb) {
    getId(data.profile, function (err, fkey) {
      Users._get(prefix + fkey, function (loginProfile) {

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

        Users._set(prefix + fkey, loginProfile, function () {
          cb(loginProfile);
        });
      });
    });
  };

  Users.getId = function (obj, cb) {
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

  Users.read = function (obj, cb) {
    var mod = mods[obj.type]
      ;

    if (!mod) {
      cb(null);
    }

    Users._read(mod.getId, obj.type + ':', obj, cb);
  };
  Users.find = Users.read;
  Users._read = function (getId, prefix, data, cb) {
    getId(data.profile, function (err, fkey) {
      Users._get(prefix + fkey, cb);
    });
  };

  return Users;
};
