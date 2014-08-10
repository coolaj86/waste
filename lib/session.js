'use strict';

module.exports.create = function () {
  var Promise = require('bluebird').Promise
    ;

  // These are just fallthrough routes
  // The real logic is handled in the sessionlogic stuff
  // (and this all should probably move there)
  function route(rest) {

    function getGuest(method, type) {
      return Promise.resolve({
        as: method
      , type: type
      , logins: []
      , accounts: []
      , account: { role: 'guest' }
      , selectedAccountId: null
      , mostRecentLoginId: null
      });
    }

    function getPublic(reqUser) {
      var ps = []
        , accounts
        ;

      if (!reqUser) {
        return null;
      }

      accounts = reqUser.accounts.map(function (account) {
        var json
          , logins = []
          ;

        console.log('account.related("logins")');
        console.log(account.related('logins'));

        // you may see that you have linked other logins,
        // even if you are not currently logged in with that login.
        ps.push(account.load('logins').then(function () {
          console.log(account.related('logins'));
          account.related('logins').forEach(function (login) {
            logins.push({
              hashid: login.id
            , provider: login.get('type')
            , comment: login.get('comment') // TODO
            });
          });
        }));

        delete account.relations.logins;
        json = account.toJSON();
        json.logins = logins;
        json.id = json.uuid;

        return json;
      });

      return Promise.all(ps).then(function () {
        var result
          ;

        result = {
          mostRecentLoginId: reqUser.login && reqUser.login.id
        , selectedAccountId: reqUser.account && reqUser.account.id
        , logins: reqUser.logins.map(function (login) {
            var l
              , p
              ;

            l = login.toJSON();
            p = l.public || {};

            p.uid = p.id;
            p.id = l.id || l.hashid;
            p.hashid = p.id;
            p.type = l.type;
            p.primaryAccountId = l.primaryAccountId;
            p.primaryAccountId = l.primaryAccountId || null;

            p.accountIds = login.related('accounts').map(function (a) { return a.id; });

            return p;
          })
        , accounts: accounts
        };

        return result;
      });
    }

    rest.get('/session', function (req, res) {
      /*
        { login: {}
        , logins: []
        , account: {}
        , accounts: []
        }
      */

      var ps = []
        ;

      req.user = req.user || { accounts: [], logins: [] };
      req.user.accounts = req.user.accounts || [];
      req.user.logins = req.user.logins || [];
      req.user.accounts.forEach(function (account) {
        ps.push(account.load(['customer', 'customer.tenant']));
      });

      Promise.all(ps).then(function () {
        if (req.user) {
          return getPublic(req.user);
        } else {
          return getGuest('get');
        }
      }).then(function (result) {
        res.send(result);
      }, function (err) {
        console.error('[ERROR] /session');
        console.error(err);
        res.error(err);
      });
    });

    // this is the fallthrough from the POST '/api' catchall
    rest.post('/session', function (req, res) {
      function fin(result) {
        res.send(result);
      }
      function errback(err) {
        res.error(err);
      }

      if (req.user) {
        return getPublic(req.user).then(fin, errback);
      } else {
        return getGuest('post').then(fin, errback);
      }
    });
    // TODO have separate error / guest and valid user fallthrough
    rest.post('/session/:type', function (req, res) {
      function fin(result) {
        res.send(result);
      }
      function errback(err) {
        res.error(err);
      }

      if (req.user) {
        return getPublic(req.user).then(fin, errback);
      } else {
        return getGuest('post', req.params.type).then(fin, errback);
      }
    });
    rest.delete('/session', function (req, res) {
      req.logout();

      getGuest('delete').then(function (result) {
        res.send(result);
      });
    });
  }

  return {
    route: route
  };
};
