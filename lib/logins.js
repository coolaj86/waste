'use strict';

var PromiseA = require('bluebird')
  , validate = require('./st-validate').validate
  ;

module.exports.createRestless = function (config, DB, Auth) {
  var AuthCodes = require('./authcodes').create(DB)
    ;

  function Logins() {
  }

  Logins.reset = function (auth) {
    return Auth.LocalLogin.get(auth).then(function ($login) {
      if (!$login) {
        throw { message: "No login found" };
      }

      return AuthCodes.create({ checkId: $login.id }).then(function ($code) {
        $code.set('loginId', $login.id);

        // TODO mail auth code here $login.get('public').emails
        console.log('## TODO: send auth code via email / sms');
        console.log('## AUTH CODE ID', $code.get('uuid'));
        console.log('## AUTH CODE', $code.get('code'));

        return $code.save().then(function () {
          return $code;
        });
      });
    });
  };

  Logins.validateReset = function (auth, authcode) {
    return Auth.LocalLogin.get(auth).then(function ($login) {
      if (!$login) {
        throw { message: "No login found" };
      }

      return AuthCodes.validate(authcode.id, authcode.code, { checkId: $login.id }).then(function (validated) {
        if (true !== validated) {
          throw new Error("auth code was not validated");
        }

        return Auth.LocalLogin.updateSecret(auth).then(function () {
          // TODO mail password changed notification here $login.get('public').emails
          console.log('[logins.js] TODO: Mail password changed notification');
        });
      });
    });
  };

  Logins.update = function ($login, accountsMap, updates) {
    return validate({
      'primaryAccountId': ''
    }, updates).then(function () {
      if (!accountsMap[updates.primaryAccountId]) {
        return PromiseA.reject(new Error("the specified account does not exist for this login"));
      }

      return $login.save(updates);
    });
  };

  Logins.updateSecret = function (auth) {
    return Auth.LocalLogin.login(auth).then(function ($login) {
      if (!$login) {
        throw { message: "cannot change secret: invalid credentials" };
      }

      auth.secret = auth.newSecret;
      return Auth.LocalLogin.updateSecret(auth);
    });
  };

  return Logins;
};

module.exports.createRestful = function (config, DB, Auth, manualLogin) {
  var Logins = module.exports.createRestless(config, DB, Auth)
    , Promise = require('bluebird').Promise
    ;

  // TODO create a custom strategy instead
  // I'm fairly certain that res.send() will never be called
  // because I'm overwriting passport's default behavior in
  // sessionlogic/local.js an provide my own handler in sessionlogic/index.js
  // 
  // Remember that passport was designed to be used with connect,
  // so if there's a bug where the promise is never fulfilled, it's worth
  // looking here to see if this is the culprit.
  function wrapManualLogin(req, res) {
    return function (uid, secret) {
      return new Promise(function (resolve, reject) {
        manualLogin(uid, secret, req, res, function (err, user) {
          if (err) {
            reject(err);
            return;
          }

          //console.log('[accounts] [user]');
          //console.log(user);
          resolve(user);
        }, { wrapped: true });
      });
    };
  }

  Logins.restful = {};

  // TODO handle 0+ accounts and 0-1 primaryAccountId
  Logins.restful.create = function (req, res) {
    var auth = { uid: req.body.uid, secret: req.body.secret }
      , manualLoginWrapped = wrapManualLogin(req, res)
      ;

    Auth.LocalLogin.create({ uid: auth.uid, secret: auth.secret })
      .then(function (/*login*/) {
        return manualLoginWrapped(auth.uid, auth.secret);
      })
      .then(function () {
        res.redirect(303, config.apiPrefix + '/session');
      })
      .error(function (err) {
        res.error({ message: err && err.message || "couldn't create login nor use the supplied credentials" });
      })
      .catch(function (err) {
        console.error('ERROR CREATE LOGIN');
        console.error(err);
        res.error(err);
      });
  };

  Logins.restful.check = function (req, res) {
    var uid = req.query.uid
      ;

    Auth.LocalLogin.get({ uid: uid })
      .then(function ($login) {
        if (!$login) {
          res.send({ exists: false });
          return;
        }

        res.send({ exists: true });
      });
  };

  // Yes, I am aware that I'm using passport exactly the wrong way here
  // and, yes, I do intend to fix it at some point
  Logins.restful.login = function (req, res) {
    var auth = { uid: req.body.uid, secret: req.body.secret }
      , manualLoginWrapped = wrapManualLogin(req, res)
      ;

    Auth.LocalLogin.login({ uid: auth.uid, secret: auth.secret })
      .then(function ($login) {
        if ($login) {
          return manualLoginWrapped(auth.uid, auth.secret);
        }
      })
      .then(function () {
        res.redirect(303, config.apiPrefix + '/session');
      })
      .error(function (err) {
        res.error({ message: err && err.message || "couldn't create login nor use the supplied credentials" });
      })
      .catch(function (err) {
        console.error('ERROR LOGIN LOGIN');
        console.error(err);
        res.error(err);
      });
  };

  Logins.restful.reset = function (req, res) {
    var auth = { uid: req.body.uid }
      ;

    Logins.reset(auth).then(function ($code) {
      res.send({ uuid: $code.id });
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error('RESET LOGIN');
      console.error(err);
      res.error(err);
    });
  };

  Logins.restful.update = function (req, res) {
    var $login = req.$login
      , updates = req.body
      , accountsMap = req.accountsMap
      ;

    Logins.update($login, accountsMap, updates).then(function () {
      res.json({ success: true });
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error("ERROR logins update");
      console.error(err);
      res.error(err);

      throw err;
    });
  };

  Logins.restful.updateSecret = function (req, res) {
    var auth = { uid: req.body.uid, secret: req.body.secret, newSecret: req.body.newSecret }
      ;

    Logins.updateSecret(auth).then(function () {
      res.send({ success: true });
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error("ERROR LOGIN UPDATE SECRET");
      console.error(err);
      res.error(err);
    });
  };

  Logins.restful.validateReset = function (req, res) {
    var authcode = { id: req.params.authid, code: req.params.authcode }
      , auth = { uid: req.body.uid, secret: req.body.secret }
      , manualLoginWrapped = wrapManualLogin(req, res)
      ;

    Logins.validateReset(auth, authcode).then(function () {
      return manualLoginWrapped(auth.uid, auth.secret).then(function () {
        res.redirect(303, config.apiPrefix + '/session');
      });
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error("ERROR LOGIN VALIDATE RESET");
      console.error(err);
      res.error(err);
    });
  };

  return Logins;
};

module.exports.create = function (app, config, DB, Auth, manualLogin) {
  var Logins
    ;

  Logins = module.exports.createRestful(config, DB, Auth, manualLogin);

  function requireLogin(req, res, next) {
    var hashid = req.params.hashid
      //, uid = req.params.uid || req.body.uid
      , reqUser = req.user
      ;

    reqUser.logins.forEach(function ($login) {
      if (hashid === $login.id) {
        req.$login = $login;
      }
    });

    if (!req.$login) {
      res.error({ message: "invalid login id" });
      return;
    }

    req.accountsMap = {};
    req.$logine.related('accounts').forEach(function ($acc) {
      req.accountsMap[$acc.id] = $acc;
    });

    next();
  }

  function route(rest) {
    // Create a new account
    rest.post('/logins', Logins.restful.create);
    rest.get('/logins', Logins.restful.check);

    rest.post('/logins/reset', Logins.restful.reset);
    rest.post('/logins/reset/:authid/:authcode', Logins.restful.validateReset);
    rest.post('/logins/:uid/reset', Logins.restful.reset);
    rest.post('/logins/:uid/reset/:authid/:authcode', Logins.restful.validateReset);

    rest.post('/logins/:hashid', requireLogin, Logins.restful.update);
    rest.post('/logins/:hashid/secret', requireLogin, Logins.restful.updateSecret);
  }

  return {
    route: route
  , Logins: Logins
  };
};
