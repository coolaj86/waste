'use strict';

var knex = require('../lib/knex-connector').knex
  ;

// TODO maybe rename typed_uid to provider_uid?
knex.schema.createTable('logins', function (t) {
  // XXX id -> uid to avoid conflict in bookshelf
  //t.uuid().notNullable().unique().index();
  t.string('typed_uid', 255).notNullable();
  t.string('uid', 255).notNullable();
  t.string('type', 255).notNullable();
  t.string('primary_account_id');
  t.primary('typed_uid');
  //t.primary(['uid', 'type']);
  //t.string('alias').nullable().references('uuid').inTable('logins');
  t.json('xattrs').notNullable().defaultTo(knex.raw("'{}'"));
  t.timestamps(); //.notNullable();
}).then(function () {
  console.log('Created logins');
});

knex.schema.createTable('accounts', function (t) {
  t.uuid('uuid').notNullable().primary();
  t.json('xattrs').notNullable().defaultTo(knex.raw("'{}'"));
  t.timestamps(); //.notNullable();
}).then(function () {
  console.log('Created accounts');
});

knex.schema.createTable('logins_accounts', function (t) {
  t.string('login_typed_uid').references('typed_uid').inTable('logins');
  t.string('account_uuid').references('uuid').inTable('accounts');
  t.primary(['login_typed_uid', 'account_uuid']);
  //t.string('login_uid').references('id').inTable('logins');
  //t.string('login_type').references('type').inTable('logins');
  //t.primary('login_type', 'login_uid', 'account_id');
  t.timestamps(); //.notNullable();
}).then(function () {
  console.log('Created logins_accounts');
});
