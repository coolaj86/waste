'use strict';

module.exports.create = function (app, config, Db) {
  var UUID = require('node-uuid')
    ;

  function Contacts() {
  }

  Contacts.restful = {}

  Contacts.restful.get = function (req, res) {
    var uuid = req.user.account.attributes.contactUuid
    //  ,id
      ;

    // if (req.user.selectedAccountId) {
    //   id = req.user.selectedAccountId;
    // } else {
    //   id = req.user.accounts[0].id;
    // }

    if (!uuid) {
      Db.Contacts.forge({ uuid: UUID.v4() }).save().then(function (contact) {
        req.user.account.attributes.contactUuid = contact.attributes.uuid;
        req.user.account.save();
        res.json([]);
      });
    } else {
      Db.ContactNodes.forge().fetchAll().then(function (nodes) {
        res.json({
          nodes: nodes.query({ where: { contactId: uuid } }).toJSON()
        });
      });
    }
  };

  Contacts.restful.create = function (req, res) {
    var uuid = req.user.account.attributes.contactUuid
      ;

    if (!uuid) {
      res.error( 'Contact missing for some reason...someone needs to replace '
               + 'this with a better error message because it is way too '
               + 'long...and uninformative.'
               );
      // I also don't know if I should log this to the server but this scenario
      // shouldn't ever happen unless the user signs in while on the contacts
      // page; but in that case half of this app is broken so I'm not
      // considering that as a real scenario...
    } else {
      req.body.contact_id = uuid;
      Db.ContactNodes.forge({ uuid: UUID.v4() }).save(req.body, { method: 'insert' }).then(function (node) {
        res.json(node.toJSON());
      });
    }
  };

  return {
    route: function (rest) {
      rest.get('/me/contacts', Contacts.restful.get);
      rest.post('/me/contacts', Contacts.restful.create);
      // rest.post('/me/contacts/:uuid', Contacts.restful.update);
      // rest.delete('/me/contacts', Contacts.restful.delete);
    }
  };
};
