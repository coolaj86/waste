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

function inflateXattrs(keys, id) {
  return function (attrs) {
    var xattrs = attrs.xattrs && JSON.parse(attrs.xattrs) || {}
      ;

    delete attrs.xattrs;
    Object.keys(xattrs).forEach(function (key) {
      if (!attrs.hasOwnProperty(key) && -1 === keys.indexOf(key)) {
        attrs[key] = xattrs[key];
      }
    });
    return toCamelCase(attrs);
  };
}

function zipXattrs(keys) {
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
    this.hasMany(Db.Accounts, 'account_uuid').through(Db.LoginsAccounts, 'account_uuid');
  }
  // format before saving
, hasTimestamps: ['created_at', 'updated_at']
, format: zipXattrs([
  , 'typedUid'
  , 'uid'
  , 'type'
  , 'primaryAccountId'
  , 'createdAt'
  , 'updatedAt'
  ])
  // parse while retrieving
, parse: inflateXattrs([
    'typed_uid'
  , 'uid'
  , 'type'
  , 'primary_account_id'
  , 'created_at'
  , 'updated_at'
  ])
});

Db.Accounts = Orm.Model.extend({
  tableName: 'accounts'
, idAttribute: 'uuid'
, logins: function () {
    this.hasMany(Db.Logins, 'typed_uid').through(Db.LoginsAccounts, 'login_typed_uid');
  }
, hasTimestamps: ['created_at', 'updated_at']
, format: zipXattrs([
    'uuid'
  , 'createdAt'
  , 'updatedAt'
  ])
, parse: inflateXattrs([
    'uuid'
  , 'created_at'
  , 'updated_at'
  ])
});

Db.LoginsAccounts = Orm.Model.extend({
  tableName: 'logins_accounts'
, hasTimestamps: ['created_at', 'updated_at']
, format: zipXattrs([
    'createdAt'
  , 'updatedAt'
  ])
, parse: inflateXattrs([
    'created_at'
  , 'updated_at'
  ])
});
