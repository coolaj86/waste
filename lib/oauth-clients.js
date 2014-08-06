'use strict';

module.exports.create = function (app, config, Db, Auth) {
  function OauthClients() {
  }
  OauthClients.restful = {};

  OauthClients.restful.create = function (req, res) {
    var account
      , id
      ;

    if (req.user.selectedAccountId) {
      id = req.user.selectedAccountId;
    } else {
      id = req.user.accounts[0].id;
    }

    Db.OauthClients.forge(req.body).save({ method: 'insert' }).then(function (client) {
      client.set('accountId', id);
      res.json(client.toJSON());
    });
  };

  return {
    route: function (rest) {
      rest.post('/me/clients', OauthClients.restful.create);
    }
  };
};
