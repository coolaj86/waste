'use strict';

module.exports.create = function (app, config, Db, Auth) {
  var UUID = require('node-uuid')
    ;

  function OauthClients() {
  }

  OauthClients.restful = {};

  OauthClients.restful.create = function (req, res) {
    var id
      ;

    if (req.user.selectedAccountId) {
      id = req.user.selectedAccountId;
    } else {
      id = req.user.accounts[0].id;
    }

    if (!req.body.secret) req.body.secret = UUID.v4();
    if (!req.body.id) req.body.id = UUID.v4();

    req.body.account_id = id;

    Db.OauthClients.forge().save(req.body, { method: 'insert' }).then(function (client) {
      res.json(client.toJSON());
    });
  };

  OauthClients.restful.get = function (req, res) {
    var id
      ;

    if (req.user.selectedAccountId) {
      id = req.user.selectedAccountId;
    } else {
      id = req.user.accounts[0].id;
    }

    Db.OauthClients.forge().fetchAll().then(function (clients) {
      res.json({
        clients: clients.query({ where: { accountId: id } }).toJSON()
      });
    });
  };

  return {
    route: function (rest) {
      rest.post('/me/clients', OauthClients.restful.create);

      rest.get('/me/clients', OauthClients.restful.get);
    }
  };
};
