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

          console.log('[accounts] [user]');
          console.log(user);
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
      .then(
        function () {
          res.redirect(303, config.apiPrefix + '/session');
        }
      /*
      , function (err) {
          res.error(undefined, err && err.message || "couldn't create login nor use the supplied credentials");
        }
      */
      );
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
      .then(
        function () {
          res.redirect(303, config.apiPrefix + '/session');
        }
      /*
      , function (err) {
          res.error(undefined, err && err.message || "couldn't create login nor use the supplied credentials");
        }
      */
      );
  };

  Logins.restful.reset = function (req, res) {
    var auth = { uid: req.body.uid }
      ;

    Logins.reset(auth).then(function ($code) {
      res.send({ uuid: $code.id });
    }, function (err) {
      res.error(err);
    });
  };

  Logins.restful.updateSecret = function (req, res) {
    var auth = { uid: req.body.uid, secret: req.body.secret, newSecret: req.body.newSecret }
      ;

    Logins.updateSecret(auth).then(function () {
      res.send({ success: true });
    }, function (err) {
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
    }).catch(function (err) {
      res.error(err);
    });
  };

  return Logins;
};

module.exports.create = function (app, config, DB, Auth, manualLogin) {
  var Logins
    ;

  /*
  function validateLogins(curLogins, newLogins, wrappedManualLogin) {
    var ps = []
      ;

    function isNewLogin(newLogin) {
      return !(newLogin.id || newLogin.hashid) && newLogin.uid && newLogin.secret;
    }

    // Logins must be in the current session OR new local logins
    function isCurrentLogin(newLogin) {
      return curLogins.some(function (login) {
        if ((login.hashid || login.id) === (newLogin.hashid || newLogin.id)) {
          return true;
        }
      });
    }

    newLogins.forEach(function (newLogin) {
      if (isCurrentLogin(newLogin)) {
        console.log('Auth.Logins.login', newLogin);
        ps.push(Auth.Logins.login(newLogin));
        return;
      }

      if (false && isNewLogin(newLogin)) {
        // TODO make logging in not a big deal
        // TODO config.apiPrefix
        ps.push(Promise.reject(new Error("This login is not in your session. POST uid and secret to /api/session/local or HTTP auth to /api/session/basic first and then try again. We don't do this for you because the process of adding a login to your session manually outside of the session handler is... not as amazingly simple as it should be.")));
      }

      if (!isNewLogin(newLogin)) {
        ps.push(Promise.reject(new Error('This login was not new, but was not in the session')));
        return;
      }

      // TODO support other types of local login here? (oauth, sms, email)... prolly not
      console.log('Auth.LocalLogin.create', newLogin);
      ps.push(Auth.LocalLogin.create(newLogin).then(function (login) {
        console.log("login.get('uid')");
        console.log(login.get('uid'));
        console.log('wrapped manual login enter');
        return wrappedManualLogin(login.get('uid'), newLogin.secret).then(function (login) {
          console.log('wrapped manual login exit');
          // TODO TODO TODO
          return login;
        });
      }));
    });

    return Promise.all(ps);
  }
  */

  Logins = module.exports.createRestful(config, DB, Auth, manualLogin);

  function route(rest) {
    function noImpl(req, res) {
      res.error(501, 'NOT IMPLEMENTED');
    }

    // Create a new account
    rest.post('/logins', Logins.restful.create);
    rest.post('/logins/session', Logins.restful.login);

    // Update the selected login... maybe to change password or verify email or create an alias
    rest.post('/logins/:uid', noImpl);
    /*
    // link an  login to the selected account
    rest.post('/logins/:hashid/accounts', noImpl);
    // unlink an account login from the selected account
    rest.delete('/logins/:hashid/accounts', noImpl);
    */
    rest.post('/logins/reset', Logins.restful.reset);
    rest.post('/logins/reset/:authid/:authcode', Logins.restful.validateReset);
  }

  return {
    route: route
  , Logins: Logins
  };
};
