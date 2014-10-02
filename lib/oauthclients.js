'use strict';

module.exports.createController = function (config, Db) {
  var UUID = require('node-uuid')
    , PromiseA = require('bluebird').Promise
    ;

  function Oauthclients() {
  }

  //
  // Controller
  //
  Oauthclients.getByAccount = function (config, accountId) {
    if (!accountId) {
      return PromiseA.reject(new Error("you did not supply an account"));
    }

    return Db.Oauthclients.forge({ account_id: accountId }).where().fetchAll();
  };

  Oauthclients.login = function (config, id, secret) {
    return Db.Oauthclients.forge({ id: id }).fetch().then(function ($client) {
      if (!$client) {
        return PromiseA.reject(new Error("Incorrect App Id"));
      }

      if (secret !== $client.get('secret')) {
        return PromiseA.reject(new Error("Incorrect Secret"));
      }

      return $client;
    });
  };

  Oauthclients.get = function (config, id) {
    return Db.Oauthclients.forge({ id: id }).fetch();
  };

  Oauthclients.create = function (config, raw) {
    var body
      ;

    ['accountId', 'secret', 'id'].forEach(function (k) {
      body[k] = raw[k];
    });

    if (!body.accountId) {
      return PromiseA.reject(new Error("no accountId to associate"));
    }

    // TODO this is just for debugging
    if (!body.secret) {
      body.secret = UUID.v4();
    }

    if (!body.id) {
      body.id = UUID.v4();
    }

    Db.Oauthclients.forge().save(body, { method: 'insert' });
  };

  return Oauthclients;
};

module.exports.create = function (app, config, Db) {
  var Oauthclients = module.exports.createController(config, Db)
    ;

  //
  // RESTful
  //
  Oauthclients.restful = {};

  Oauthclients.restful.create = function (req, res) {
    var accountId = req.user.account.id
      , body = req.body
      ;

    body.accountId = accountId;

    Oauthclients.create(req.config, body).then(function ($client) {
      res.json($client.toJSON());
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('CREATE OAUTH CLIENT');
      console.error(err);
      res.error(err);
    });
  };

  Oauthclients.restful.get = function (req, res) {
    var accountId = req.user.account.id
      ;

    Oauthclients.getByAccount(req.config, accountId).then(function ($clients) {
      res.json({ clients: $clients.toJSON() });
    }).error(function (err) {
      console.error(err);
      res.error(err);
    }).catch(function (err) {
      console.error('GET');
      console.error(err);
      res.error(err);
    });
  };


  // 
  // ROUTES
  //
  Oauthclients.route = function (rest) {
    rest.post('/me/clients', Oauthclients.restful.create);
    rest.get('/me/clients', Oauthclients.restful.get);
  };
  Oauthclients.Oauthclients = Oauthclients;

  return Oauthclients;
};
