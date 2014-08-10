'use strict';

var Db = {}
  ;

module.exports.Db = Db;
module.exports.models = {
  AddressBooks:
  { idAttribute: 'uuid'
  }
, Addresses:
  { idAttribute: 'id'
  , account: function () {
      return this.belongsTo(Db.Account, 'account_uuid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, Accounts:
  { idAttribute: 'uuid'
  , logins: function () {
      return this.belongsToMany(Db.Logins);
      //return this.belongsToMany(Db.Logins, 'accounts_logins', 'account_uuid', 'login_hashid');
    }
  , oauth_clients: function () {
      return this.hasMany(Db.OauthClients);
    }
  , contact: function () {
      return this.hasOne(Db.Contacts, 'account_uuid');
    }
  , addresses: function () {
      return this.hasMany(Db.Addresses, 'account_uuid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, AccountsLogins:
  // no idAttribute
  { account: function () {
      return this.belongsTo(Db.Accounts);
      //return this.belongsTo(Db.Accounts, 'account_uuid');
    }
  , login: function () {
      return this.belongsTo(Db.Logins);
      //return this.belongsTo(Db.Logins, 'login_hashid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, Contacts:
  { contact_nodes: function () {
      return this.hasMany(Db.ContactNodes, 'contact_uuid');
    }
  , account: function () {
      return this.belongsTo(Db.Accounts, 'account_uuid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, ContactNodes:
  { contacts: function () {
      this.belongsTo(Db.Contacts, 'contact_uuid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt', 'deletedAt']
  }
, Logins:
  { idAttribute: 'hashid'
  , accounts: function () {
      return this.belongsToMany(Db.Accounts);
      //return this.belongsToMany(Db.Accounts, 'accounts_logins', 'login_hashid', 'account_uuid');
    }
    // format before saving
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, OauthClients:
  { accounts: function () {
      return this.belongsTo(Db.Accounts);
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
};
