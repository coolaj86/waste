'use strict';

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

  function route(rest) {
    function noImpl(req, res) {
      res.error(501, 'NOT IMPLEMENTED');
    }

    // Create a new account
    rest.post('/logins', Logins.restful.create);
    rest.post('/logins/session', Logins.restful.login);

    /*
    // link an  login to the selected account
    rest.post('/logins/:hashid/accounts', noImpl);
    // unlink an account login from the selected account
    rest.delete('/logins/:hashid/accounts', noImpl);
    */
    rest.post('/logins/reset', Logins.restful.reset);
    rest.post('/logins/reset/:authid/:authcode', Logins.restful.validateReset);

    // Update the selected login... maybe to change password or verify email or create an alias
    rest.post('/logins/:uid', noImpl);
  }

  return {
    route: route
  , Logins: Logins
  };
};
