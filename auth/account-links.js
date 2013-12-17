'use strict';

module.exports.create = function (opts) {
  var AccountLinks = {}
    , mods = {}
    , cache = {}
    ;

  function save() {
  }

  AccountLinks.register = function (type, fn) {
    mods[type] = fn;
  };

  AccountLinks.register('facebook', function (ids, data) {
    ids.push('fb:' + data.id);
    console.log('data', data);
    data.emails.forEach(function (emailObj) {
      // TODO should confirm e-mail address before allowing access, as facebook sometimes makes mistakes
      // see http://stackoverflow.com/questions/14280535/is-it-possible-to-check-if-an-email-is-confirmed-on-facebook
      ids.push('email:' + emailObj.value.toLowerCase());
    });

    return ids;
  });

  AccountLinks.register('email', function (ids, data) {
    ids.push('email:' + data.email.toLowerCase());
  });

  AccountLinks.scrape = function (data) {
    var ids = []
      , fn = mods[data.type]
      ;

    if (!fn) {
      // TODO return error message
      return [];
    }

    return fn(ids, data);
  };

  AccountLinks.read = function (id) {
    return cache[id] || [];
  };
  AccountLinks.find = AccountLinks.read;

  AccountLinks.link = function (id, accountId) {
    AccountLinks.read(id).push(accountId);
  };

  AccountLinks.create = function (id, aid) {
    if (!cache[id]) {
      cache[id] = [];
    }
    if (-1 === cache[id].indexOf(aid)) {
      cache[id].push(aid);
    }
    save();
  };

  return AccountLinks;
};
