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

  Users.register = function (type, ver, create, read) {
    mods[type] = {};
    mods[type].create = create;
    mods[type].read = read;
  };

  // Facebook
  Users.register('facebook', '1.0.0', function (prefix, data) {
    var user
      , id
      ;

    console.log('in create', prefix, data);
    if (!data.profile.id) {
      throw new Error("user has no uinque identifier for which to save!");
    }

    id = prefix + data.profile.id;

    user = users[id] || users[data.profile.profileUrl];

    if (user) {
      data.uuid = user.uuid;
    }
    user = data;
    if (!user.uuid) {
      user.uuid = UUID.v4();
    }

    //users[id] = { follow: user.uuid };
    //users[user.uuid] = user;
    users[id] = user;
    delete users[user.profileUrl];

    fs.writeFileSync(dbpath, JSON.stringify(users, null, '  '), 'utf8');

    return user;
  }, function (prefix, data) {
    var user
      , id
      ;

    id = prefix + data.profile.id;
    user = users[id];

    return user;
  });
  // end facebook

  Users.create = function (data) {
    var fn = mods[data.type]
      ;

    if (!fn || !fn.create) {
      return null;
    }

    return fn.create(data.type + ':', data);
  };

  Users.read = function (obj) {
    var fn = mods[obj.type]
      ;

    if (!fn || !fn.read) {
      return null;
    }

    return fn.read(obj.type + ':', obj);
  };

  Users.find = Users.read;

  return Users;
};
