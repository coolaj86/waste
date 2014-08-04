'use strict';

var Storage = require('dom-storage')
  , JsonStorage = require('json-storage').JsonStorage
  , path = require('path')
  , dbpath = path.join(__dirname, '..', 'db', 'permissions.json')
  , store = JsonStorage.create(new Storage(dbpath, { strict: false }), false, { stringify: false })
  , scopeGroups
  , fieldGroups
  , vocab = {}
  ;

fieldGroups = ['readable', 'writeable', 'executable'];

// ["HIGH_PRIEST", "ELDER", "RELIEF_SOCIETY", "PRIEST", "TEACHER", "DEACON", "LAUREL", "MIA_MAID", "BEEHIVE", "ADULTS"]
scopeGroups = {
//  'stake': {} // meta data, not including members
  'stake.leadership': {}
, 'stake.members': {}
, 'stake.adults': {}
, 'stake.high_priests': {}
, 'stake.elders': {}
, 'stake.relief_society': {}
, 'stake.priests': {}
, 'stake.teachers': {}
, 'stake.deacons': {}
, 'stake.laurels': {}
, 'stake.mia_maids': {}
, 'stake.beehives': {}

//, 'ward': {} // meta data not including members
, 'ward.leadership': {}
, 'ward.members': {}
, 'ward.adults': {}
, 'ward.high_priests': {}
, 'ward.elders': {}
, 'ward.relief_society': {}
, 'ward.priests': {}
, 'ward.teachers': {}
, 'ward.deacons': {}
, 'ward.laurels': {}
, 'ward.mia_maids': {}
, 'ward.beehives': {}
};

exports.parse = function parseScope(scopes) {
  var scopeObjs = {}
    , invalid = []
    ;

  // group.subgroup:rfields:wfields:xfields
  // TODO check individual fields
  scopes.forEach(function (scope) {
    var groups = scope.split(':')
      , group = groups[0] || ''
      ;
      
    if (!groups[0]) {
      groups = [];
    }
    if (!scopeGroups[group]) {
      invalid.push({
        group: group
      , readable: (groups[1] || '').split(/,/)
      , writeable: (groups[2] || '').split(/,/)
      , executable: (groups[3] || '').split(/,/)
      , raw: scope
      });
    } else {
      scopeObjs[group] = {
        group: group
      , readable: (groups[1] || '').split(/,/)
      , writeable: (groups[2] || '').split(/,/)
      , executable: (groups[3] || '').split(/,/)
      };
      if (!scopeObjs[group].readable[0]) {
        scopeObjs[group].readable = [];
      }
      if (!scopeObjs[group].writeable[0]) {
        scopeObjs[group].writeable = [];
      }
      if (!scopeObjs[group].executable[0]) {
        scopeObjs[group].executable = [];
      }
    }
  });

  return { scopes: scopeObjs, invalid: invalid };
};

exports.get = function (userId, AppId, cb) {
  cb(null, store.get(userId + ':' + AppId));
};

exports._delta = function (grantedScope, requestedScope) {
  grantedScope = grantedScope || { scope: {} };
  requestedScope = requestedScope || { scope: {} };

  var newScope = {}
    ;

  Object.keys(requestedScope.scope).forEach(function (groupname) {
    var reqGroup = requestedScope.scope[groupname]
      , hasGroup = grantedScope.scope[groupname]
      , newGroup
      ;

    if (!reqGroup) {
      return;
    }
    if (!hasGroup) {
      newScope[groupname] = reqGroup;
      return;
    }

    fieldGroups.forEach(function (key) {
      var reqFields = reqGroup[key]
        , hasFields = hasGroup[key]
        ;

      if (!reqFields || 0 === reqFields.length) {
        return;
      }

      if (!hasFields) {
        newGroup[key] = reqFields.slice(0);
        return;
      }

      reqFields.forEach(function (field) {
        if (-1 === hasFields.indexOf(field)) {
          if (!newGroup) {
            newGroup = newScope[groupname] = { };
            newGroup.group = hasGroup.group || reqGroup.group;
          }
          if (!newGroup[key]) {
            newGroup[key] = [];
          }
          newGroup[key].push(field);
        }
      });
    });
  });

  return { scope: newScope };
};

exports.delta = function (userId, AppId, opts, cb) {
  exports.get(userId, AppId, function (err, grantedScope) {
    var rawScopes = opts.rawScope || []
      , parsed = exports.parse(rawScopes)
      , newScope = exports._delta(grantedScope, { scope: parsed.scopes }, parsed.invalid)
      ;

    cb(null, newScope, parsed.invalid, parsed.scopes);
  });
};

// TODO make subgroups subojects?
exports.merge = function (curScopeGrants, newScopeGrants) {
  newScopeGrants = newScopeGrants || { scope: {} };
  curScopeGrants = curScopeGrants || { scope: {} };

  Object.keys(newScopeGrants.scope).forEach(function (groupname) {
    // groupname i.e. stake.leadership
    // group i.e. { group: "", readable: [], writeable: [], executable: [] }
    var curGroup = curScopeGrants.scope[groupname] = curScopeGrants.scope[groupname] || {}
      , newGroup = newScopeGrants.scope[groupname] = newScopeGrants.scope[groupname] || {}
      ;

    curGroup.group = curGroup.group || newGroup.group;
    fieldGroups.forEach(function (key) {
      curGroup[key] = curGroup[key] || [];
      newGroup[key] = newGroup[key] || [];

      newGroup[key].forEach(function (newField) {
        if (-1 === curGroup[key].indexOf(newField)) {
          curGroup[key].push(newField);
        }
      });
    });
  });

  return curScopeGrants;
};

exports.set = function (userId, AppId, val, cb) {
  var existing = store.get(userId + ':' + AppId)
    ;

  val = exports.merge(existing, val);
  store.set(userId + ':' + AppId, val);
  if (cb) {
    cb(null);
  }
};

vocab = {
  'name': 'names'
, 'photo': 'photos'
, 'email': 'email addresses'
, 'phone': 'phone numbers'
, 'address': 'mailing addresses'
};
exports.stringify = function (objScope) {
  var strings = []
    ;

  Object.keys(objScope.scope).forEach(function (groupname) {
    var names = groupname.split(/\./g)
      , group = objScope.scope[groupname]
      , unit = names[0]
      , subgroups = names[1].split(/_/)
      , subgroup
      , privs = []
      , priv
      ;

    subgroups.forEach(function (str, i) {
      subgroups[i] = str.charAt(0).toUpperCase() + str.slice(1);
    });

    subgroup = subgroups.join(' ');

    strings.push({
      group:
        'Use information about the '
      + subgroup 
      + ' in your '
      + (unit.charAt(0).toUpperCase() + unit.slice(1))
      + ' to '
    , privs: privs
    });

    if ((group.readable||[]).length) {
      priv = '';
      priv += 'view';
      group.readable.forEach(function (perm, i) {
        if (i === (group.readable.length - 1)) {
          if (i > 0) {
            priv += ' and';
          }
          priv += ' ' + vocab[perm];
        } else {
          if (0 === i) {
            priv += ' ' + vocab[perm];
          } else {
            priv += ', ' + vocab[perm];
          }
        }
      });
      privs.push(priv);
    }

    if ((group.writeable||[]).length) {
      priv = '';
      priv += 'view & update';
      group.writeable.forEach(function (perm, i) {
        console.log('1', perm, '2', vocab[perm]);
        if (i === (group.writeable.length - 1)) {
          if (i > 0) {
            priv = priv + ' and';
          }
          priv = priv + ' ' + vocab[perm];
        } else {
          if (0 === i) {
            priv = priv + ' ' + vocab[perm];
          } else {
            priv = priv + ', ' + vocab[perm];
          }
        }
      });
      privs.push(priv);
    }

    if ((group.executable||[]).length) {
      priv = '';
      if (-1 !== group.executable.indexOf('texting') || -1 !== group.executable.indexOf('emailing')) {
        priv += 'send';
        if (-1 !== group.executable.indexOf('texting')) {
          priv += ' texts';
          if (-1 !== group.executable.indexOf('emailing')) {
            priv += ' &';
          }
        }
        if (-1 !== group.executable.indexOf('emailing')) {
          priv += ' emails';
        }
      }
      if (-1 !== group.executable.indexOf('calling')) {
        if (priv.length > 5) {
          priv += ' and';
        }
        priv += ' make calls';
      }
    }
    if (priv) {
      privs.push(priv);
    }

  });

  return strings;
};
