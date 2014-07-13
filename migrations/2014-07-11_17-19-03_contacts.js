'use strict';

module.exports.create = function (knex) {
  return knex.schema.createTable('_st_meta_', function (t) {
    // TODO test all of the special columns
    t.uuid('uuid').unique().index().notNullable();
    t.json('xattrs').notNullable().defaultTo(knex.raw("'{}'"));
    // TODO check timestamps for timezone info
    t.timestamps();
  }).then(function () {

    // TODO establish a case where contacts own their contact information
    //   * may share it with others willy-nilly
    //   * when others update a phone number, it verifies with the contact
    // What we have here is a many-to-many-to-many-to-many relationship
    // a phone number could have easily belonged to multiple people in the past
    // an email address, facebook, or twitter could belong to multiple people now (marrieds, tech support)
    knex.schema.createTable('address_books', function (t) {
      t.uuid('uuid').unique().index().notNullable();
      t.primary('uuid');

      t.uuid('account_uuid').notNullable(); // TODO .references('uuid').inTable('accounts');

      t.json('xattrs').notNullable().defaultTo(knex.raw("'{}'"));
      t.timestamps(); //.notNullable();
    }).then(function () {
      console.log('Created address_books');
    });
  });

  /*
  knex.schema.createTable('phones', function (t) {
    // http://stackoverflow.com/questions/723587/whats-the-longest-possible-worldwide-phone-number-i-should-consider-in-sql-varc
    t.string('phone', 30).unique().index().notNullable();
    t.primary('phone');
    t.string('alias').references('uuid').inTable('aliases_contacts');

    t.json('xattrs').notNullable().defaultTo(knex.raw("'{}'"));
    t.timestamps(); //.notNullable();
  }).then(function () {
    console.log('Created phones');
  });

  knex.schema.createTable('emails', function (t) {
    // http://stackoverflow.com/questions/723587/whats-the-longest-possible-worldwide-phone-number-i-should-consider-in-sql-varc
    t.string('email', 255).unique().index().notNullable();
    t.primary('email');
    t.string('alias').references('uuid').inTable('aliases_contacts');

    t.json('xattrs').notNullable().defaultTo(knex.raw("'{}'"));
    t.timestamps(); //.notNullable();
  }).then(function () {
    console.log('Created emails');
  });

  knex.schema.createTable('aliases_contacts', function (t) {
    // XXX id -> uid to avoid conflict in bookshelf
    t.uuid('uuid').unique().index().notNullable();
    t.primary('uuid');

    t.uuid('contact_uuid').unique().index().notNullable();


    t.json('xattrs').notNullable().defaultTo(knex.raw("'{}'"));
    t.timestamps(); //.notNullable();
  }).then(function () {
    console.log('Created logins');
  });
  */
};
