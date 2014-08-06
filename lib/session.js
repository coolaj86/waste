'use strict';

module.exports.create = function () {
  // These are just fallthrough routes
  // The real logic is handled in the sessionlogic stuff
  // (and this all should probably move there)
  function route(rest) {

    function getGuest(method, type) {
      return {
        as: method
      , type: type
      , logins: []
      , accounts: []
      , account: { role: 'guest' }
      , selectedAccountId: null
      , mostRecentLoginId: null
      };
    }

    function getPublic(reqUser) {
      if (!reqUser) {
        return null;
      }

      return {
        mostRecentLoginId: reqUser.login.id
      , selectedAccountId: reqUser.account && reqUser.account.id
      , logins: reqUser.logins.map(function (login) {
          var l
            , p
            ;

          l = login.toJSON();
          p = l.public;

          p.uid = p.id;
          p.id = l.id || l.hashid;
          p.hashid = p.id;
          p.type = l.type;
          p.primaryAccountId = l.primaryAccountId || null;

          console.log('[related] session 8', !!login.related);
          p.accountIds = login.related('accounts').map(function (a) { return a.id; });

          return p;
        })
      , accounts: reqUser.accounts.map(function (account) {
          var logins = []
            , json
            ;

          // you may see that you have linked other logins,
          // even if you are not currently logged in with that login.
          account.load('logins').then(function () {
            account.related('logins').forEach(function (login) {
              logins.push({
                hashid: login.id
              , provider: login.get('type')
              , comment: login.get('comment') // TODO
              });
            });
          });

          delete account.relations.logins;
          json = account.toJSON();
          json.logins = logins;
          json.id = json.uuid;

          return json;
        })
      };
    }

    rest.get('/session', function (req, res) {
      /*
        { login: {}
        , logins: []
        , account: {}
        , accounts: []
        }
      */
      res.send(getPublic(req.user) || getGuest('get'));
    });
    // this is the fallthrough from the POST '/api' catchall
    rest.post('/session', function (req, res) {
      res.send(getPublic(req.user) || getGuest('post'));
    });
    // TODO have separate error / guest and valid user fallthrough
    rest.post('/session/:type', function (req, res) {
      res.send(getPublic(req.user) || getGuest('post', req.params.type) );
    });
    rest.delete('/session', function (req, res) {
      req.logout();
      res.send(getGuest('delete'));
    });
  }

  return {
    route: route
  };
};
