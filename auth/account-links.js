'use strict';

module.exports.create = function (opts) {
  var AccountLinks = {}
    , mods = {}
    , cache = {}
    ;

  function save() {
  }

  AccountLinks.register = function (type, ver, fn) {
    mods[type] = {};
    mods[type].version = ver;
    mods[type].getIds = fn;
  };

  AccountLinks._getIds = function (data) {
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
  AccountLinks.scrape = AccountLinks._getIds;

  AccountLinks.register('email', function (ids, data) {
    ids.push('email:' + data.email.toLowerCase());
  });

  AccountLinks.read = function (id) {
    return cache[id];
  };
  AccountLinks.find = AccountLinks.read;

  AccountLinks.create = function (loginId, accountId) {
    var accountIds = AccountLinks.read(loginId)
      ;

    if (!accountIds) {
      accountIds = [];
      cache[loginId] = accountIds;
    }

    if (-1 === accountIds.indexOf(accountId)) {
      accountIds.push(accountId);
    }

    save();
  };

  return AccountLinks;
};
