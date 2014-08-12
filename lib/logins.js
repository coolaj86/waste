'use strict';

module.exports.create = function (app, config, DB, Auth, manualLogin) {
  var Promise = require('bluebird').Promise
    ;


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

      /*
      if (isNewLogin(newLogin)) {
        // TODO make logging in not a big deal
        // TODO config.apiPrefix
        ps.push(Promise.reject(new Error("This login is not in your session. POST uid and secret to /api/session/local or HTTP auth to /api/session/basic first and then try again. We don't do this for you because the process of adding a login to your session manually outside of the session handler is... not as amazingly simple as it should be.")));
      }
      */

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



  function Logins() {
  }
  Logins.restful = {};

  // TODO handle 0+ accounts and 0-1 primaryAccountId
  Logins.restful.create = function (req, res) {
    var authId = req.body.uid
      , authSecret = req.body.secret
      , manualLoginWrapped = wrapManualLogin(req, res)
      ;

    Auth.LocalLogin.create(req.body)
      .then(function (/*login*/) {
        return manualLoginWrapped(authId, authSecret);
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

  function route(rest) {
    function noImpl(req, res) {
      res.error(501, 'NOT IMPLEMENTED');
    }

    // Create a new account
    rest.post('/logins', Logins.restful.create);
    // Update the selected login... maybe to change password or verify email or create an alias
    rest.post('/logins/:hashid', noImpl);
    /*
    // link an  login to the selected account
    rest.post('/logins/:hashid/accounts', noImpl);
    // unlink an account login from the selected account
    rest.delete('/logins/:hashid/accounts', noImpl);
    */
  }

  return {
    route: route
  };
};
