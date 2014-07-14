'use strict';

var utils = require('./bookshelf-utils')
  ;
  
function init(knex, meta, tableMap) {
  var Orm = require('bookshelf').initialize(knex)
    , Db = {}
    , emu = meta.xattrs.type // json | text
    ;

  function createModel(tablename, obj) {
    var ucamel = tablename
      , snake = utils.str.underscored(tablename)
      ;

    if (!obj.tableName) {
      obj.tableName = snake;
    }

    if ('undefined' === typeof obj.hasTimestamps) {
      obj.hasTimestamps = ['created_at', 'updated_at'];
    }

    console.log('tableMap');
    console.log(tableMap);
    obj.format = utils.format(emu, 'xattrs', tableMap[snake], []/*jsonCols*/);
    obj.parse = utils.parse(emu, 'xattrs', tableMap[snake], []/*(jsonCols*/);
    Db[ucamel] = Orm.Model.extend(obj);

    return Db[ucamel];
  }

  function createModels(map) {
    Object.keys(map).forEach(function (key) {
      console.log(map, key, map[key]);
      createModel(key, map[key]);
    });
  }

  createModels(
    { Data:
      { idAttribute: 'uuid'
      }
    }
  , { AddressBooks:
      { idAttribute: 'uuid'
      }
    /*
    , users: function () {
        this.belongsTo(Db.Accounts, 'logins_accounts', 'login_typed_uid', 'account_uuid');
      }
    */
    }
  );

  /*
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
  */

  return Db;
}

module.exports.create = function myCreate(knex) {
  var tablesMap = {}
    , info
    ;

  function createTables() {
    console.log('[create tables]');
    return require('../migrations').create(knex).then(function () {
      return myCreate(knex);
    });
  }

  try {
    info = knex('_st_meta_').columnInfo();
  } catch(e) {
    console.error("Couldn't get columnInfo");
    console.error(e);
    return createTables();
  }

  return info.then(function (meta) {
    if (0 === Object.keys(meta).length) {
      console.error('[no keys]', meta);
      return createTables();
    }

    // TODO provide an array
    var table = 'data'
      ;

    return knex(table).columnInfo().then(function (cols) {
      tablesMap[table] = cols;
    }).then(function () {
      return init(knex, meta, tablesMap);
    }, function (err) {
      console.error('[no table]', table);
      console.error(err);
    });
  }, function (err) {
    console.error('[bookshelf-models] [ERROR]');
    console.error(err);
  });
};
