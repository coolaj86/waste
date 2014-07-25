'use strict';

var Db = {}
  ;

module.exports.Db = Db;
module.exports.models = {
  AddressBooks:
  { idAttribute: 'uuid'
  }
, Logins:
  { idAttribute: 'typedUid'
  , accounts: function () {
      return this.belongsToMany(Db.Accounts, 'accounts_logins', 'login_typed_uid', 'account_uuid');
    }
    // format before saving
  , hasTimestamps: ['created_at', 'updated_at']
  }
, Accounts:
  { idAttribute: 'uuid'
  , logins: function () {
      return this.belongsToMany(Db.Logins, 'accounts_logins', 'account_uuid', 'login_typed_uid');
    }
  , hasTimestamps: ['created_at', 'updated_at']
  }
, AccountsLogins:
  // no idAttribute
  { account: function() {
      return this.belongsTo(Db.Accounts, 'account_uuid');
    }
  , login: function() {
      return this.belongsTo(Db.Logins, 'login_typed_uid');
    }
  , hasTimestamps: ['created_at', 'updated_at']
  }
};
