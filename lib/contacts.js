'use strict';

module.exports.create = function (app, config, Db) {
  var UUID = require('node-uuid')
    ;

  function Contacts() {
  }

  Contacts.restful = {}

  Contacts.restful.get = function (req, res) {
    var id
      ;

    if (req.user.selectedAccountId) {
      id = req.user.selectedAccountId;
    } else {
      id = req.user.accounts[0].id;
    }

    console.log(req.user.accounts[0]);
  };

  return {
    route: function (rest) {
      rest.get('/me/contacts', Contacts.restful.get);
      // rest.post('/me/contacts', Contacts.restful.create);
      // rest.post('/me/contacts/:uuid', Contacts.restful.update);
      // rest.delete('/me/contacts', Contacts.restful.delete);
    }
  };
};
