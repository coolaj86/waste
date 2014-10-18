'use strict';

var UUID = require('node-uuid')
  , PromiseA = require('bluebird').Promise
  ;

module.exports.createController = function (config, DB/*, Auth*/) {
  function Accounts() {
  }

  Accounts.create = function (config, newAccount/*, newLogins, curAccounts, curLogins*/) {
    var uuid = UUID.v4()
      , $account
      ;

    $account = DB.Accounts.forge(newAccount);

    return $account/*.on('query', logQuery)*/.save({ uuid: uuid }, { method: 'insert' });
  };

  Accounts.get = function (config, id) {
    return DB.Accounts.forge({ uuid: id }).fetch();
  };

  Accounts.getData = function (config, $account, id) {
    return PromiseA.reject(new Error("not implemented"));
  };

  Accounts.setData = function (config, $account, id, data) {
    return PromiseA.reject(new Error("not implemented"));
  };

  return Accounts;
};

/*
module.exports.createView = function (config, DB, Auth) {
};
*/

module.exports.createRouter = function (app, config, DB, Auth) {
  var Accounts = module.exports.createController()
    ;

  Accounts.restful = {};

  // handles the creation of an account and linking it to existing accounts
  Accounts.create = function (newAccount, newLogins, curAccounts, curLogins) {
    var curLoginsMap = {}
      , p
      ;

    //
    // check that all logins are ones I'm currently logged into
    //
    curLogins.forEach(function (l) {
      curLoginsMap[l.id] = l.id;
    });

    if (!newLogins.length) {
      return PromiseA.reject({ message: 'You didn\'t give any accounts to link to' });
    }

    if (newLogins.some(function (l) {
      if (!l.id) {
        p = PromiseA.reject({ message: 'You gave a login without an id' });
        return true;
      }

      if (!curLoginsMap[l.id]) {
        p = PromiseA.reject({ message: 'You gave a login that is not in your current session' });
        return true;
      }
    })) {
      return p;
    }

    //
    // check that the account doesn't violate basic constraints
    //
    if (newAccount.id || newAccount.uuid) {
      return PromiseA.reject({
        message: 'You may not supply your own account id when creating an account', code: 501
      });
    }

    if (newAccount.role) {
      return PromiseA.reject({
        message: 'You may not supply your own role when creating an account', code: 501
      });
    }

    //
    // create the account
    //
    return Auth.Accounts.create(newAccount).then(function (account) {
      var ps = []
        ;

      //
      // account this new accaut
      //
      curLogins.forEach(function (login) {
        ps.push(Auth.Logins.linkAccounts(login, [account]).catch(function (err) {
          // TIM TIM why can't I attach things?
          if (/SQLITE_CONSTRAINT: UNIQUE/.test(err.message)) {
            console.warn('[1] Bookshelf used FML. It was very effective');
            return PromiseA.resolve(login);
          }

          console.error(err);
          throw err;
        }));
      });

      //
      // return the result
      //
      return PromiseA.all(ps).then(function (logins) {
        var ps = []
          ;

        logins.forEach(function (login) {
          ps.push(Auth.Logins.letPrimaryAccount(login, account));
        });

        return PromiseA.all(ps);
      });
    });
  };

  Accounts.restful.setData = function (req, res) {
    return Accounts.setData(config, req.$account, req.params.id, req.body).then(function (data) {
      res.send(data);
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error("ERROR accounts setData");
      console.error(err);
      res.error(err);

      throw err;
    });
  };

  Accounts.restful.getData = function (req, res) {
    return Accounts.setData(config, req.$account, req.params.id).then(function (data) {
      res.send(data);
    }).error(function (err) {
      res.error(err);
    }).catch(function (err) {
      console.error("ERROR accounts getData");
      console.error(err);
      res.error(err);

      throw err;
    });
  };

  // TODO handle account and 0+ logins
  Accounts.restful.create = function (req, res) {
    var newAccount = req.body
      , linkedLogins = newAccount.logins || []
      , curLogins = req.user.logins || []
      , curAccounts = req.user.accounts || []
      ;

    // , wrapManualLogin(req, res)

    Accounts.create(
      newAccount
    , linkedLogins
    , curAccounts
    , curLogins
    )
      .then(function (account) {
        // TODO don't resend entire session
        //res.send({ success: true });

        // if no account is selected, select this one
        if (!req.user.selectedAccountId) {
          req.user.selectedAccountId = account.id;
        }

        res.redirect(303, config.apiPrefix + '/session');
      }, function (err) {
        res.send({
          error: { 
            message: err && err.message || 'invalid logins or accounts'
          , code: err && err.code
          }
        });
      });
  };

  function requireAccount(req, res, next) {
    req.user.accounts.some(function ($acc) {
      if ($acc.id === req.params.accountId) {
        req.$account = $acc;
      }
    });

    next();
  }

  function route(rest) {
    function noImpl(req, res) {
      res.error(501, 'NOT IMPLEMENTED');
    }

    // Create a new account
    rest.post('/accounts', Accounts.restful.create);
    // Update the selected account
    rest.post('/accounts/:accountId', noImpl);
    // link a login to the selected account
    rest.post('/accounts/:accountId/logins', noImpl);
    // unlink a login from the selected account
    rest.delete('/accounts/:accountId/logins', noImpl);

    rest.get('/accounts/:accountId/data/:id', requireAccount, Accounts.restful.getData);
    rest.post('/accounts/:accountId/data/:id', requireAccount, Accounts.restful.setData);
  }

  return {
    route: route
  };
};
