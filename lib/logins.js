'use strict';

var PromiseA = require('bluebird').Promise
  , UUID = require('uuid')
  , secretutils = require('secret-utils')
  , validate = require('./st-validate').validate
  ;

module.exports.createController = function (config, DB, Auth, ContactNodes) {
  var AuthCodes = require('./authcodes').create(DB)
      // TODO make these maybe a little bit better
    //, salts = [secretutils.url64(192), secretutils.url64(192)]
    ;

  // used to create tokens that will expire every 30 minutes
  /*
  setInterval(function () {
    salts.pop();
    salts.unshift(secretutils.url64(192));
  }, 15 * 60 * 1000);
  */

  function Logins() {
  }

  Logins.sendEmailCode = function (mailconf, $code) {
    var email = $code.get('loginNode')
      , mailer = require('./comms/mailer').Mailer.create(mailconf.service, mailconf.opts)
      ;

    // TODO provide link?
    // console.log('## AUTH CODE ID', $code.get('uuid'));
    return mailer.send({
      from: mailconf.defaults.system
    , to: email
    //, bcc: opts.mailer.defaults.bcc
    //, replyTo: (contact.name || texterName)
    //    + ' <' + texterEmail + '>'
    , subject: "Your verification code is " + $code.get('code')
    , text: "Type " + $code.get('code') + " into the verification window in the page on which you requested to verify your email address."
        + "\n\nIf you didn't request this verification code, please ignore this email."
    });
  };

  Logins.sendPhoneCode = function (twilconf, $code) {
    var phone = $code.get('loginNode')
      , texter = require('./comms/texter').Texter.create('twilio', twilconf)
      ;

    return texter.send({
      to: phone
    , from: twilconf.systemNumber || twilconf.number
    , body: "Your verification code is " + $code.get('code')
    });
  };

  Logins.getClaimCode = function (type, node) {
    // TODO first check if this is the only login on another account
    var id
      , fnode
      ;

    if (!ContactNodes.validators[type]) {
      return PromiseA.reject(new Error("Did not understand " + type));
    }

    if (!ContactNodes.validators[type](node)) {
      return PromiseA.reject(new Error("That doesn't look like a valid " + type));
    }

    switch(type) {
      case 'email':
        fnode = ContactNodes.formatters.email(node);
        break;
      case 'phone':
        fnode = ContactNodes.formatters.phone(node);
        break;
      default:
        return PromiseA.reject(new Error("Could not handle " + type));
        //break;
    }

    id = secretutils.md5sum('claim-login:' + fnode);

    return AuthCodes.create({ checkId: id }).then(function ($code) {
      $code.set('loginNode', fnode);
      $code.set('nodeType', type);

      return $code.save().then(function () {
        return $code;
      });
    });
  };

  Logins.sendAuthCode = function (conf, $code) {
    var type = $code.get('nodeType')
      ;

    switch(type) {
      case 'email':
        return Logins.sendEmailCode(conf.mailer || config.mailer, $code).then(function () {
          return $code;
        });
        //break;
      case 'phone':
        return Logins.sendPhoneCode(conf.twilio || config.twilio, $code).then(function () {
          return $code;
        });
        //break;
      default:
        return PromiseA.reject(new Error("Could not handle " + type));
        //break;
    }
  };

  Logins.validateClaimCode = function (type, node, id, code, opts) {
    opts = opts || opts;
    var fnode = ContactNodes.formatters.phone(node)
          || ContactNodes.formatters.email(node)
      , checkId = secretutils.md5sum('claim-login:' + fnode)
      ;

    return AuthCodes.validate(
      id
    , code
    , { checkId: checkId, destroyOnceUsed: opts.destroyOnceUsed }
    ).then(function (validated) {
      if (!validated) {
        return PromiseA.reject(new Error("code was not valid"));
      }

      return true;
    });
  };

  /*
  Logins.upsertContactNodes = function (type, node) {
    return DB.ContactNodes.forge({ type: type, node: node });
  };
  */

  Logins.claimContactNodes = function (contactnodes) {
    var ps = []
      ;

    // TODO provide ability to limit to one email, one phone, one username
    contactnodes.forEach(function (cn) {
      var p
        ;

      if ('username' === cn.type) {
        p = Logins.check(cn.type, cn.node).then(function (exists) {
          if (exists) {
            return PromiseA.reject(new Error("username" + cn.node + "not available"));
          }
        });
      } else {
        p = Logins.validateClaimCode(cn.type, cn.node, cn.uuid, cn.code, { destroyOnceUsed: false });
      }

      ps.push(p);
    });

    return PromiseA.all(ps).then(function (claims) {
      var err
        ;

      if (!claims.every(function (c) {
        if (true !== c) {
          err = c;
          return false;
        }

        return true;
      })) {
        return PromiseA.reject(err);
      }

      return null;
    }).then(function () {
      contactnodes.forEach(function (cn) {
        var p
          ;

        if ('username' === cn.type) {
          p = PromiseA.resolve(true);
        } else {
          p = Logins.validateClaimCode(cn.type, cn.node, cn.uuid, cn.code, { destroyOnceUsed: true });
        }

        p = p.then(function () {
          ContactNodes.upsert(cn.type, cn.node);
        });

        ps.push(p);
      });

      return PromiseA.all(ps);
    });
  };
  Logins.createLoginOnly = function (secret) {
    var $login = DB.Logins.forge()
      , loginId = UUID.v4()
      , creds = secretutils.createShadow(secret)
      ;

    return $login
      .save(
        { uid: loginId
        , type: 'local'
        , hashid: secretutils.md5sum('local:' + loginId)
        , shadow: creds.shadow
        , salt: creds.salt
        , hashtype: creds.hashtype
        , public: {}
        }
      , { method: 'insert'
        }
      );
  };
  /*
  Logins.addContactNode = function ($login, $contactnode, opts) {
    opts = opts || {};
  };
  */
  Logins.addContactNodes = function ($login, $contactnodes, opts) {
    //return $login.related('contactnodes').attach($contactnodes);
    opts = opts || {};

    var ps = []
      ;

    $contactnodes.forEach(function ($cn) {
      var p
        ;
        
      p = DB.LoginNodes.forge({ contactnodeId: $cn.id }).fetch().then(function ($ln) {
        if (!$ln) {
          return null;
        }

        if ($ln.get('loginId') !== $login.id) {
          if (!opts.validated) {
            return PromiseA.reject(new Error($cn.get('node')
              + " is already claimed by another account. "
              + "Please use the confirmation code to claim it. "
            ));
          }

          return $ln;
        }

        return $ln;
      });

      ps.push(p);
    });

    // TODO how to make this an atomic transaction?
    return PromiseA.all(ps).then(function ($lns) {
      var $cns = $contactnodes.slice(0)
        , ps2 = []
        ;

      $lns.forEach(function ($ln, i) {
        var $cn = $cns[i]
          , p2
          ;

        if (!$ln) {
          p2 = DB.LoginNodes.forge().save({
            loginId: $login.id
          , contactnodeId: $cn.id
          , validatedAt: opts.validated && (new Date().toISOString()) || null
          }, { method: 'insert' });

          ps2.push(p2);
          return;
        }

        if ($ln.get('contactnodeId') === $cn.id) {
          $ln._processed = true;
          $ln._noChange = true;

          ps2.push(PromiseA.resolve($ln));
          return;
        } else {
          $ln._processed = true;
          $ln._oldLn = $ln.toJSON();

          p2 = $ln.save({
            loginId: $login.id
          , contactnodeId: $cn.id
          , validatedAt: opts.validated && (new Date().toISOString()) || null
          }, { method: 'update' });

          ps2.push(p2);
          return;
        }
      });

      return PromiseA.all(ps2).then(function ($lns) {
        return $lns;
      }).error(function (err) {
        // TODO rollback
        // it's not likely that there would be a reason to rollback since everything
        // is double-checked before it is processed, however, it could happen that
        // two operations (an unprotected double-click take place simultaneously)
        // and in that instance the operation should succeed or fail completely.

        throw err;
      });
    });
  };

  // NOTE to eliminate the possibility of partially created logins,
  // this is intentionally an all-or-nothing process
  Logins.create = function (contactnodes, secret) {
    // TODO allow adding unvalidated contacts?
    var minLen = 8
      ;

    if (!(secret && secret.length >= minLen)) {
      // TODO move rules elsewhere (function in config? should be async)
      return PromiseA.reject(new Error('Must have a secret at least ' + minLen + ' characters long to create a login'));
    }

    return Logins.claimContactNodes(contactnodes).then(function ($contactnodes) {
      return Logins.createLoginOnly(secret).then(function ($login) {
        return Logins.addContactNodes($login, $contactnodes, { validated: true });
      });
    });
  };

  /*
  Logins.addContactNode = function (contactnodes, secret) {
    return AuthCodes.validate(id, code, { checkId: checkId, destroyOnceUsed: true }).then(function (validated) {
    });
  };
  */

  Logins.check = function (type, node) {
    var fnode = ContactNodes.formatters.email(node)
          || ContactNodes.formatters.phone(node)
          || ContactNodes.formatters.username(node)
      , id = fnode && secretutils.md5sum(fnode)
      ;

    if (!fnode) {
      return PromiseA.reject(new Error(node + " is not a valid contactnode"));
    }

    if (!id) {
      return PromiseA.reject(new Error(node + " could not be determined as email, phone, or username"));
    }

    return DB.LoginNodes
      .forge({ contactnodeId: id })
      //.on('query', function (q) { console.log(q); })
      .fetch({ withRelated: [/*'contactnode', */'login'] })
      .then(function ($ln) {
        return $ln && !!$ln.related('login').id || null;
      });
  };

  Logins.login = function (type, node, secret) {
    var fnode = ContactNodes.formatters.email(node)
          || ContactNodes.formatters.phone(node)
          || ContactNodes.formatters.username(node)
      , id = fnode && secretutils.md5sum(fnode)
      ;

    return DB.LoginNodes
      .forge({ contactnodeId: id })
      //.on('query', function (q) { console.log(q); })
      .fetch({ withRelated: [/*'contactnode', */'login'] })
      .then(function ($ln) {
        var $login
          , valid
          ;

        if (!$ln) {
          return PromiseA.reject(new Error("invalid login"));
        }

        if (!$ln.related('login').id) {
          return PromiseA.reject(new Error("invalid login (error 2)"));
        }

        $login = $ln.related('login');

        valid = secretutils.testSecret(
          $login.get('salt')
        , secret
        , $login.get('shadow') // hashed version
        , $login.get('hashtype')
        );

        if (!valid) {
          return PromiseA.reject(new Error("invalid secret"));
        }
      });
  };



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
    var xattrs = updates.xattrs
      ;

    delete updates.xattrs;

    return validate({
      'primaryAccountId': ''
    , 'mostRecentAccountId': ''
    }, updates).then(function () {
      if (!accountsMap[updates.primaryAccountId]) {
        return PromiseA.reject(new Error("the specified account does not exist for this login"));
      }

      updates.xattrs = xattrs;
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
module.exports.createRestless = module.exports.createController;

module.exports.createView = function (config, DB, Auth, manualLogin, ContactNodes) {
  var Logins = module.exports.createController(config, DB, Auth, ContactNodes)
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
      return new PromiseA(function (resolve, reject) {
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
    var uid = req.query.uid || ''
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
module.exports.createRestful = module.exports.createView;

module.exports.create = function (app, config, DB, Auth, manualLogin, ContactNodes) {
  var Logins
    ;

  Logins = module.exports.createView(config, DB, Auth, manualLogin, ContactNodes);

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
    // TODO guard with AppID
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
