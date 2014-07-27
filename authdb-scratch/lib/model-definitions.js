'use strict';

var Db = {}
  ;

module.exports.Db = Db;
module.exports.models = {
  AddressBooks:
  { idAttribute: 'uuid'
  }
  /*
  var User = Bookshelf.Model.extend({
    tableName: 'users',
    idAttribute: 'uid',
    roles: function() {
      return this.belongsToMany(Role, 'users_roles', 'uid', 'rid');
    }
  });
  */
, Logins:
  { idAttribute: 'typedUid'
  , accounts: function () {
      //return this.belongsToMany(Db.Accounts);
      //return this.belongsToMany(Db.Accounts, 'accounts_logins', 'account_uuid', 'login_typed_uid');
      return this.belongsToMany(Db.Accounts, 'accounts_logins', 'login_typed_uid', 'account_uuid');
    }
    // format before saving
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, Accounts:
  { idAttribute: 'uuid'
  , logins: function () {
      return this.belongsToMany(Db.Logins, 'accounts_logins', 'account_uuid', 'login_typed_uid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
, AccountsLogins:
  // no idAttribute
  { account: function() {
      return this.belongsTo(Db.Accounts, 'account_uuid');
    }
  , login: function() {
      return this.belongsTo(Db.Logins, 'login_typed_uid');
    }
  , hasTimestamps: ['createdAt', 'updatedAt']
  }
};
