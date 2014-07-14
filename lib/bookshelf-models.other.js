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

    console.log('this');
    console.log(this);

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

Db.Schedules = Orm.Model.extend({
  tableName: 'schedules'
, idAttribute: 'id'
, hasTimestamps: ['createdAt', 'updatedAt']
, format: zipXattrs('xattrs', [
    'id'
  , 'dtstart'
  , 'until'
  , 'rrule'
  , 'previous'
  , 'next'
  , 'event'
  , 'createdAt'
  , 'updatedAt'
  ])
  // parse while retrieving
, parse: inflateXattrs('xattrs')
});

Db.Appointments = Orm.Model.extend({
  tableName: 'appointments'
, idAttribute: 'id'
, hasTimestamps: ['createdAt', 'updatedAt']
, schedule: function () {
    this.hasOne(Db.Schedules, 'schedule_id');
  }
, format: zipXattrs('xattrs', [
    'id'
  , 'scheduleId'
  , 'dtstart'
  , 'until'
  , 'createdAt'
  , 'updatedAt'
  ])
, parse: inflateXattrs('xattrs')
});
