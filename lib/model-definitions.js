'use strict';

var Db = {}
  ;

module.exports.Db = Db;
module.exports.models = {
  Accounts:
  { idAttribute: 'uuid'
  , logins: function () {
      return this.belongsToMany(Db.Logins);
      //return this.belongsToMany(Db.Logins, 'accounts_logins', 'account_uuid', 'login_hashid');
    }
  , oauthclients: function () {
      return this.hasMany(Db.Oauthclients, 'account_uuid');
    }
  , contact: function () {
      return this.hasOne(Db.Contacts, 'account_uuid');
    }
  , addresses: function () {
      return this.hasMany(Db.Addresses, 'account_uuid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, Accesstokens:
  { idAttribute: 'id'
    // as client
  , oauthclient: function () {
      return this.belongsTo(Db.Oauthclients, 'oauthclient_uuid');
    }
    // by client as and in behalf of user
  , account: function () {
      return this.belongsTo(Db.Accounts, 'account_uuid');
    }
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
, Addresses:
  { idAttribute: 'uuid'
  , account: function () {
      return this.belongsTo(Db.Accounts, 'account_uuid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, Apikeys:
  { idAttribute: 'id'
  , oauthclient: function () {
      return this.belongsTo(Db.Oauthclients, 'oauthclient_uuid');
    }
  }
, Contacts:
  { contactnodes: function () {
      return this.hasMany(Db.Contactnodes, 'contact_uuid');
    }
  , account: function () {
      return this.belongsTo(Db.Accounts, 'account_uuid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, Contactnodes:
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
, Oauthclients:
  { idAttribute: 'uuid'
  , accounts: function () {
      return this.belongsTo(Db.Accounts, 'account_uuid');
    }
  , apikeys: function () {
      return this.hasMany(Db.Apikeys, 'oauthclient_uuid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
};
