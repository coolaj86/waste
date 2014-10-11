'use strict';

// NOTES
// create and delete require the parent
// get and getAll are done in the require, which requires the parent as context
// (the view bits do not)
// update needs schema

var PromiseA = require('bluebird').Promise
  ;

module.exports.createController = function (config, Db) {
  var UUID = require('node-uuid')
    , authutils = require('./auth-logic/utils-auth')
    , validate = require('./st-validate').validate
    ;

  function Oauthclients() {
  }

  //
  // Controller
  //
  Oauthclients.login = function (config, key, secret) {
    return Db.Apikeys
      .forge({ id: authutils.hashsum('sha256', key) })
      .fetch({ withRelated: ['oauthclient'] })
      .then(function ($apikey) {
        if (!$apikey) {
          return PromiseA.reject(new Error("Incorrect Api Key"));
        }

        if ($apikey.get('insecure')) {
          if (!secret || secret === 'anonymous') {
            return $apikey;
          } else {
            return PromiseA.reject(new Error("Incorrect Secret (insecure)"));
          }
        } else {
          if (authutils.testSecret($apikey.get('salt'), secret, $apikey.get('shadow'), $apikey.get('hashtype'))) {
            return $apikey;
          } else {
            return PromiseA.reject(new Error("Incorrect Secret"));
          }
        }
      });
  };

  Oauthclients.lookup = function (config, key, opts) {
    opts = opts || {};

    return Db.Apikeys
      .forge({ id: opts.id && key || authutils.hashsum('sha256', key) })
      .fetch({ withRelated: ['oauthclient'] })
      .then(function ($apikey) {
        if (!$apikey) {
          return PromiseA.reject(new Error("Incorrect Api Key"));
        }

        return $apikey;
      });
  };

  //
  // Helpers
  //
  function removeThing($things, id) {
    return $things.some(function ($thing, i) {
      if ($thing.id === id) {
        $thing.models.splice(i, 1);
        $thing.length -= 1;

        return true;
      }
    });
  }

  function selectThing($things, id, keyName) {
    var $t
      ;

    $things.forEach(function ($thing) {
      if (keyName) {
        if ($thing.get(keyName) === id) {
          $t = $thing;
        }
      } else if ($thing.id === id) {
        $t = $thing;
      }
    });

    return $t;
  }

  function updateThing($thing, updates) {
    Object.keys(updates).forEach(function (key) {
      if ('undefined' === typeof updates[key]) {
        return;
      }
        
      if (updates[key] !== $thing.get(key)) {
        $thing.set(key, updates[key]);
      }
    });

    if ($thing.hasChanged()) {
      return $thing.save();
    }

    return PromiseA.resolve();
  }

  //
  // API Keys
  //
  Oauthclients.createKeys = function (config, $client, opts) {
    var keypair = {}
      ;

    [ 'urls'
    , 'ips'
    , 'testers'
    , 'insecure'
    , 'test'
    , 'desc'
    , 'expiresAt'
    ].forEach(function (k) {
      if (k in opts) {
        keypair[k] = opts[k];
      }
    });

    if (opts.insecure) {
      keypair.secret = 'anonymous';
    }

    if (opts.test) {
      keypair.key = 'pub_test_' + (opts.key || authutils.randomBytes(24));
      keypair.secret = keypair.secret || 'sec_test_' + (opts.secret || authutils.randomBytes(48));
    } else {
      keypair.key = 'pub_prod_' + authutils.randomBytes(24);
      keypair.secret = keypair.secret || 'sec_prod_' + authutils.randomBytes(48);
    }

    keypair.id = authutils.hashsum('sha256', keypair.key);
    keypair.salt = authutils.genSalt();
    keypair.shadow = authutils.createShadow(keypair.secret, 'sha384', keypair.salt).shadow;
    keypair.hashtype = 'sha384';

    keypair.oauthclientUuid = $client.id;

    return Db.Apikeys.forge().save(keypair, { method: 'insert' }).then(function ($apikey) {
      $client.related('apikeys').length += 1;
      $client.related('apikeys').models.push($apikey);

      return $apikey;
    });
  };

  Oauthclients.getAllKeys = function (config, $client) {
    return $client.related('apikeys');
  };

  Oauthclients.getKeys = function (config, $client, keyId) {
    var $keys = selectThing($client.related('apikeys'), keyId)
      ;

    return $keys;
  };

  Oauthclients.updateKeys = function (config, $key, updates) {
    return updateThing($key, updates);
  };

  Oauthclients.deleteKeys = function (config, $client, $key) {
    var key = $key.toJSON()
      ;

    removeThing($client.related('apikeys'), $key.id);

    return $key.destroy().then(function () {
      return key;
    });
  };

  //
  // Oauth Client Apps
  //
  Oauthclients.create = function (config, $account, raw) {
    var client = {}
      , keypairs
      , ps = []
      ;

    [ 'name'
    , 'desc'
    , 'urls'
    , 'ips'
    , 'logo'
    , 'repo'
    , 'keywords'
    , 'insecure'
    , 'status'
    , 'test'
    , 'primary_id'
    //, 'published'
    , 'testers'
    ].forEach(function (k) {
      if (k in raw) {
        client[k] = raw[k];
      }
    });

    client.accountUuid = $account.id;

    if (Array.isArray(raw.apikeys)) {
      keypairs = raw.apikeys;
    }
    keypairs = keypairs || [];

    keypairs.forEach(function (keypair) {
      if ('key' in keypair || 'secret' in keypair) {
        keypair.test = true;
      }

      ps.push(validate({
        'key': ''
      , 'secret': ''
      , 'test': true
      , 'insecure': true
      , 'desc': ''
      , 'urls': ['']
      , 'ips': ['']
      , 'testers': []
      , 'expiresAt': new Date()
      }, keypair));
    });

    if (!client.accountUuid) {
      return PromiseA.reject(new Error("no accountUuid to associate"));
    }

    client.uuid = UUID.v4();

    return PromiseA.all(ps).then(function () {
      return Db.Oauthclients.forge().save(client, { method: 'insert' }).then(function ($client) {
        return $client.related('apikeys').fetch().then(function () {
          var ps = []
            ;

          function genKeys() {
            var keySets = []
              ;

            // create test keys
            // create client keys
            if (!$client.get('test')) {
              if (!$client.get('insecure')) {
                keySets.push({
                  test: false
                , insecure: false
                , desc: "key for secure clients (ssl enabled web servers - node, ruby, python, etc)"
                });
              }

              keySets.push({
                test: false
              , insecure: true
              , desc: "key for insecure clients (browser, native apps, mobile apps)"
              });
            }

            if (!$client.get('insecure')) {
              keySets.push({
                test: true
              , insecure: false
              , desc: "test key for secure clients (ssl enabled web servers - node, ruby, python, etc)"
              });
            }

            keySets.push({
              test: true
            , insecure: true
            , desc: "test key for insecure clients (browser, native apps, mobile apps)"
            });

            return keySets;
          }

          if (!keypairs.length) {
            keypairs = genKeys();
          }

          keypairs.forEach(function (pair) {
            ps.push(Oauthclients.createKeys(config, $client, pair));
          });

          return PromiseA.all(ps).then(function (/*pairs*/) {
            return $client;
          });
        });
      });
    });
  };

  Oauthclients.get = function (config, $account, clientId) {
    if (clientId) {
      return Oauthclients.getOne(config, $account, clientId);
    } else {
      return Oauthclients.getAll(config, $account);
    }
  };

  Oauthclients.getOne = function (config, $account, clientId) {
    if (!clientId) {
      return null;
    }

    return $account.related('oauthclients').fetch({ withRelated: ['apikeys'] }).then(function () {
      return selectThing($account.related('oauthclients'), clientId);
    });
  };

  Oauthclients.getAll = function (config, $account) {
    return $account.related('oauthclients').fetch({ withRelated: ['apikeys'] }).then(function () {
      return $account.related('oauthclients');
    });
  };


  Oauthclients.update = function (config, $client, updates) {
    return validate({
      'name': ''
    , 'desc': ''
    , 'urls': ['']
    , 'ips': ['']
    , 'logo': ''
    , 'repo': ''
    , 'keywords': ['']
    , 'insecure': true
    , 'status': ''
    , 'test': true
    //, 'primaryId'
    //, 'published'
    , 'testers': []
    , 'apikeys': [{
        'id': '' // allowed as an identifier, not mutable
      , 'urls': ['']
      , 'ips': ['']
      , 'testers': []
      , 'desc': ''
      , 'expiresAt': new Date()
      }]
    }, updates).then(function () {
      var apikeys = updates.apikeys || []
        , ps = []
        ;

      delete updates.apikeys;

      ps.push(updateThing($client, updates));

      apikeys.forEach(function (pair) {
        var $pair = selectThing($client.related('apikeys'), pair.id)
          ;

        delete pair.id;
        ps.push(updateThing($pair, pair));
      });

      return PromiseA.all(ps);
    });
  };

  Oauthclients.delete = function (config, $account, $client) {
    var client = $client.toJSON()
      , ps = []
      ;

    removeThing($account.related('oauthclients'), $client.id);

    $client.related('apikeys').forEach(function ($key) {
      removeThing($client.related('apikeys'), $key.id);
      ps.push($key.destroy());
    });

    ps.push($client.destroy());

    return PromiseA.all(ps).then(function () {
      return client;
    });
  };

  return Oauthclients;
};

module.exports.createView = function (config, Db) {
  var Oauthclients = module.exports.createController(config, Db)
    ;

  //
  // RESTful OAuth
  //
  Oauthclients.restful = {};

  //
  // API Keys
  //
  Oauthclients.restful.createKeys = function (req, res) {
    var config = req.config
      , $client = req.$client
      , keys = req.body
      ;

    Oauthclients.createKeys(config, $client, keys).then(function ($key) {
      res.json($key.toJSON());
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('CREATE Api Keys');
      console.error(err);
      res.error(err);

      throw err;
    });
  };

  Oauthclients.restful.getAllKeys = function (req, res) {
    var $keys = req.$keys
      ;

    res.json($keys.toJSON());
  };

  Oauthclients.restful.getKeys = function (req, res) {
    var $key = req.$key
      ;

    res.json($key.toJSON());
  };

  Oauthclients.restful.updateKeys = function (req, res) {
    var config = req.config
      , updates = req.body
      , $key = req.$key
      ;

    Oauthclients.updateKeys(config, $key, updates).then(function () {
      res.json({ success: true });
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('UPDATE API Keys');
      console.error(err);
      res.error(err);

      throw err;
    });
  };

  Oauthclients.restful.deleteKeys = function (req, res) {
    var config = req.config
      , $client = req.$client
      , $key = req.$key
      ;

    Oauthclients.deleteKeys(config, $client, $key).then(function (key) {
      res.json(key);
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('DELETE API Keys');
      console.error(err);
      res.error(err);

      throw err;
    });
  };


  //
  // OAuth Client Apps
  //
  Oauthclients.restful.create = function (req, res) {
    var config = req.config
      , $account = req.user.account
      , client = req.body
      ;

    Oauthclients.create(config, $account, client).then(function ($client) {
      res.json($client.toJSON());
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('CREATE OAUTH CLIENT');
      console.error(err);
      res.error(err);

      throw err;
    });
  };

  Oauthclients.restful.getAll = function (req, res) {
    var $clients = req.$clients
      ;

    res.json($clients.toJSON());
  };

  Oauthclients.restful.getOne = function (req, res) {
    var $client = req.$client
      ;

    res.json($client.toJSON());
  };

  Oauthclients.restful.update = function (req, res) {
    var config = req.config
      //, $account = req.user.account
      , $client = req.$client
      , client = req.body
      ;

    Oauthclients.update(config, $client, client).then(function ($client) {
      res.json($client.toJSON());
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('UPDATE OAUTH CLIENT');
      console.error(err);
      res.error(err);

      throw err;
    });
  };

  Oauthclients.restful.delete = function (req, res) {
    var config = req.config
      , $account = req.user.account
      , $client = req.$client
      ;

    Oauthclients.delete(config, $account, $client).then(function (client) {
      res.json(client);
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('DELETE OAUTH CLIENT');
      console.error(err);
      res.error(err);

      throw err;
    });
  };

  return Oauthclients;
};

module.exports.createRouter = function (app, config, Db) {
  var Oauthclients = module.exports.createView(config, Db)
    ;

  function requireClient(req, res, next) {
    var $account = req.user.account
      , clientId = req.params.clientId
      , p
      ;

    if (clientId) {
      p = Oauthclients.getOne(null, $account, clientId).then(function ($client) {
        req.$client = $client;

        if (!$client) {
          return PromiseA.reject(new Error("did not find client"));
        }

        next();
      });
    } else {
      p = Oauthclients.getAll(null, $account).then(function ($clients) {
        req.$clients = $clients;

        if (!$clients) {
          return PromiseA.reject(new Error("did not find clients associated with this account"));
        }

        next();
      });
    }

    return p.error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('ERROR requireClient');
      console.error(err);
      res.error(err);

      throw err;
    });
  }

  function requireKeys(req, res, next) {
    var $client = req.$client
      , keyId = req.params.keyId
      , p
      ;

    if (keyId) {
      p = Oauthclients.getKeys(null, $client, keyId).then(function ($key) {
        req.$key = $key;

        if (!$key) {
          return PromiseA.reject(new Error("keys not found by that id"));
        }

        next();
      });
    } else {
      p = Oauthclients.getAllKeys(null, $client).then(function ($keys) {
        req.$keys = $keys;

        if (!$keys) {
          return PromiseA.reject(new Error("keys not found by that id"));
        }

        next();
      });
    }
    
    return p.error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('ERROR requireClient');
      console.error(err);
      res.error(err);

      throw err;
    });
  }

  // 
  // ROUTES
  //
  Oauthclients.route = function (rest) {
    rest.post('/me/clients', Oauthclients.restful.create);
    rest.get('/me/clients', requireClient, Oauthclients.restful.getAll);
    rest.get('/me/clients/:clientId', requireClient, Oauthclients.restful.getOne);
    rest.post('/me/clients/:clientId', requireClient, Oauthclients.restful.update);
    rest.delete('/me/clients/:clientId', requireClient, Oauthclients.restful.delete);

    //rest.post('/me/clients/:clientId/keys', requireClient, Oauthclients.restful.createKeys);
    rest.get('/me/clients/:clientId/keys', requireClient, requireKeys, Oauthclients.restful.getAllKeys);
    rest.get('/me/clients/:clientId/keys/:keyId', requireClient, requireKeys, Oauthclients.restful.getKeys);
    rest.post('/me/clients/:clientId/keys/:keyId', requireClient, requireKeys, Oauthclients.restful.updateKeys);
    rest.delete('/me/clients/:clientId/keys/:keyId', requireClient, requireKeys, Oauthclients.restful.deleteKeys);

    /*
    rest.post('/me/clients', Oauthclients.restful.create);
    rest.get('/me/clients', requireClient, Oauthclients.restful.getAll);
    rest.get('/me/clients/:clientId', requireClient, Oauthclients.restful.getOne);
    rest.post('/me/clients/:clientId', requireClient, Oauthclients.restful.update);
    rest.delete('/me/clients/:clientId', requireClient, Oauthclients.restful.delete);

    rest.post('/me/clients/:clientId/keys', requireClient, Oauthclients.restful.createKeys);
    rest.get('/me/clients/:clientId/keys', requireClient, requireKeys, Oauthclients.restful.getAllKeys);
    rest.get('/me/clients/:clientId/keys/:keyId', requireClient, requireKeys, Oauthclients.restful.getKeys);
    rest.post('/me/clients/:clientId/keys/:keyId', requireClient, requireKeys, Oauthclients.restful.updateKeys);
    rest.delete('/me/clients/:clientId/keys/:keyId', requireClient, requireKeys, Oauthclients.restful.deleteKeys);    */
  };
  Oauthclients.Oauthclients = Oauthclients;

  return Oauthclients;
};
