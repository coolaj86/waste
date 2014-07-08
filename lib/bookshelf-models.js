'use strict';

var knex = require('./knex-connector').knex
  , Orm = require('bookshelf').initialize(knex)
  , Db = module.exports
  , _ = require('lodash')
  ;

_.str = require('underscore.string');

function toSnakeCase(attrs) {
  return _.reduce(attrs, function(memo, val, key) {
    memo[_.str.underscored(key)] = val;
    return memo;
  }, {});
}

function toCamelCase(attrs) {
  return _.reduce(attrs, function(memo, val, key) {
    memo[_.str.camelize(key)] = val;
    return memo;
  }, {});
}

function inflateXattrs(xattrKey, keys) {
  xattrKey = xattrKey || 'xattrs';
  keys = keys || [];

  return function (attrs) {
    attrs = toCamelCase(attrs);

    var xattrs = attrs[xattrKey] || {}
        // escape xattrKey?
      , keys = Object.keys(attrs)
      ;

    if ('string' === typeof xattrs && -1 !== ['"','{','[','n','t','f','1','2','3','4','5','6','7','8','9'].indexOf(xattrs[0])) {
      xattrs = JSON.parse(xattrs);
    } else {
      console.warning("WARNING: Don't store strings in a json field");
    }
    delete attrs[xattrKey];

    Object.keys(xattrs).forEach(function (key) {
      if (!attrs.hasOwnProperty(key) && -1 === keys.indexOf(key)) {
        attrs[key] = xattrs[key];
      }
    });

    return attrs;
  };
}

function zipXattrs(xattrKey, keys) {
  return function (attrs) {
    var xattrs = {}
      ;

    Object.keys(attrs).forEach(function (key) {
      if (-1 === keys.indexOf(key)) {
        xattrs[key] = attrs[key];
        delete attrs[key];
      }
    });

    // This is VERY important because a fetch
    // should not be string-matching the json blob
    if (Object.keys(xattrs).length) {
      attrs.xattrs = JSON.stringify(xattrs);
    }

    attrs = toSnakeCase(attrs);
    return attrs;
  };
}

Db.Logins = Orm.Model.extend({
  tableName: 'logins'
, idAttribute: 'typedUid'
, accounts: function () {
    this.belongsToMany(Db.Accounts, 'logins_accounts', 'login_typed_uid', 'account_uuid');
    //return this.hasMany(Db.Accounts, 'account_uuid').through(Db.AccountsLogins, 'account_uuid');
  }
  // format before saving
, hasTimestamps: ['created_at', 'updated_at']
, format: zipXattrs('xattrs', [
  , 'typedUid'
  , 'uid'
  , 'type'
  , 'primaryAccountId'
  , 'createdAt'
  , 'updatedAt'
  ])
  // parse while retrieving
, parse: inflateXattrs('xattrs')
});

Db.Accounts = Orm.Model.extend({
  tableName: 'accounts'
, idAttribute: 'uuid'
, logins: function () {
    //this.hasMany(Db.Logins, 'typed_uid').through(Db.AccountsLogins, 'login_typed_uid');
    return this.belongsToMany(Db.Logins, 'accounts_logins', 'account_uuid', 'login_typed_uid');
  }
, hasTimestamps: ['created_at', 'updated_at']
, format: zipXattrs('xattrs', [
    'uuid'
  , 'createdAt'
  , 'updatedAt'
  ])
, parse: inflateXattrs('xattrs')
});

Db.AccountsLogins = Orm.Model.extend({
  tableName: 'logins_accounts'
, hasTimestamps: ['created_at', 'updated_at']

  // relations
, account: function() {
    return this.belongsTo(Db.Accounts, 'account_uuid');
  }
, login: function() {
    return this.belongsTo(Db.Logins, 'login_typed_uid');
  }

  // meta
, format: zipXattrs('xattrs', [
    'createdAt'
  , 'updatedAt'
  ])
, parse: inflateXattrs('xattrs')
});
