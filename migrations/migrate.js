'use strict';

var Promise = require('es6-promise').Promise
  ;

module.exports.create = function (knex) {
  require('./pre-migrate');
  var meta
      // TODO migrations rather than just tables
    , tables = require('./migrations')
    ;

  meta = {
    tablename: '_st_meta_'
  , timestamps: true
  , xattrs: true
  , cols: [
      { name: { type: 'string', length: 255 } }
    ]
  };

  function createTable(props) {
    return knex.schema.createTable(props.tablename, function (t) {
      if (props.uuid) {
        t.uuid('uuid').unique().index().notNullable();
        t.primary('uuid');
      }
      if (props.xattrs) {
        t.json('xattrs').notNullable().defaultTo(knex.raw("'{}'"));
      }
      if (props.timestamps) {
        t.timestamps(); //.notNullable();
      }

      if (!props.cols) {
        return;
      }

      props.cols.forEach(function (col) {
        switch (col.type) {
          case 'string':
            t.string(col.name, col.length);
            break;
        }
      });
    }).then(function (data) {
      console.info('[table] [created]', props.tablename);
      return data;
    }, function (err) {
      console.error('[table] [create-fail]');
      console.error(props);
      console.error(err);
      throw err;
    });
  }

  function getTable(props) {
    return knex(props.tablename).columnInfo().then(function (info) {
      if (!Object.keys(info).length) {
        return createTable(props).then(function () {
          return getTable(props);
        });
      }

      return { name: props.tablename, meta: info };
    }, function (err) {
      console.error(err);
      return createTable(props);
    });
  }

  return getTable(meta).then(function (info) {
    var ps = [{ name: meta.tablename, meta: info }]
      ;

    // TODO determine if table needs creating or not
    tables.forEach(function (table) {
      ps.push(getTable(table));
    });

    // whatever calls this can't return from this promise with a promise...
    // stupid es6 promises... that I'm stupidly deciding to use...
    return Promise.all(ps);
  });
};
