'use strict';

var UUID = require('node-uuid')
  , fs = require('fs')
  ;

module.exports.create = function (opts) {
  var Users = {}
    , users = require(opts.dbfile)
    , dbpath = opts.dbfile
    , mods = {}
    ;

  Users.all = users;

  Users.isAdmin = function (user) {
    return 'https://www.facebook.com/coolaj86' === user.profileUrl;
  };

  Users.register = function (type, ver, getId, create, read) {
    mods[type] = {};
    mods[type].getId = getId;
    mods[type].create = create;
    mods[type].read = read;
  };

  Users._get = function (id, cb) {
    cb(users[id]);
  };
  Users.findById = Users._get;

  Users._set = function (id, user, cb) {
    users[id] = user;
    fs.writeFileSync(dbpath, JSON.stringify(users, null, '  '), 'utf8');
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
      Users._get(prefix + fkey, function (user) {
        if (user) {
          data.uuid = user.uuid;
          data.id = data.type + ':' + data.fkey;
        }
        user = data;
        if (!user.uuid) {
          user.uuid = UUID.v4();
          data.id = data.type + ':' + data.fkey;
        }

        Users._set(prefix + fkey, user, function () {
          cb(user);
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
