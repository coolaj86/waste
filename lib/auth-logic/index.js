'use strict';

var PromiseA = require('bluebird').Promise
  ;

module.exports.create = function (Db/*, config*/) {
  var Logins = require('./logins').create(Db)
    , Accounts = require('./accounts').create(Db)
    , LocalLogin = require('./locals').create(Logins.Logins.create('local'))
    , AppLogin = require('../oauthclients').createController(/*config*/null, Db)
    , Oauth2Login = require('./oauth2-providers').create(Db, Logins.Logins.create('oauth2'))
    , AccessTokens = require('./access-tokens').create(Db, Logins.Logins.create('bearer'))
    , Auth
    ;

  // TODO
  // don't reconstitute the logins and accounts that aren't in use

  function deserialize(sessionIds) {
    return Logins.mget(sessionIds.loginIds).then(function ($logins) {
      var accounts = []
        , logins = $logins.filter(function () { return true; })
        , $account
        , accountIds = []
        , $login
        ;

      logins.forEach(function ($l) {
        $l.related('accounts').forEach(function ($account) {
          if (-1 === accountIds.indexOf($account.id)) {
            accountIds.push($account.id);
            accounts.push($account);
          }
        });
      });

      if (!sessionIds.selectedAccountId) {
        logins.some(function ($l) {
          if ($l.id === sessionIds.mostRecentLoginId) {
            sessionIds.selectedAccountId = $l.get('primaryAccountId');
            return true;
          }
        });
      }

      if (!sessionIds.selectedAccountId) {
        logins.some(function ($l) {
          return (sessionIds.selectedAccountId = $l.get('primaryAccountId'));
        });
      }

      accounts.forEach(function ($a) {
        if ($a.id === sessionIds.selectedAccountId) {
          $account = $a;
        }
      });

      if (!$account) {
        sessionIds.selectedAccountId = null;
      }

      logins.forEach(function ($l) {
        if ($l.id === sessionIds.mostRecentLoginId) {
          $login = $l;
        }
      });

      if (!$login) {
        sessionIds.mostRecentLoginId = null;
      }

      return {
        // make a copy
        mostRecentLoginId: sessionIds.mostRecentLoginId
      , login: $login
      , logins: logins
      , $logins: logins // reconstituted?
      , $login: $login

      , selectedAccountId: sessionIds.selectedAccountId
      , account: $account
      , accounts: accounts
      , $accounts: accounts // reconstituted?
      , $account: $account
      };
    });
  }

  function handleNewLogin(reqUser) {
    return PromiseA.resolve().then(function (resolve, reject) {
      var $newLogin = reqUser.$newLogin
        ;

      if (!$newLogin) {
        return reqUser.$login;
      }

      delete reqUser.$newLogin;

      // Add the new login to the current session
      if (!reqUser.logins.some(function ($l) {
        if ($l.id === $newLogin.id) {
          return true;
        }
      })) {
        reqUser.logins.push($newLogin);
      }

      reqUser.$login = $newLogin;
      reqUser.mostRecentLoginId = $newLogin.id;

      // TODO remove, this is justbackwards compat
      reqUser.login = $newLogin.toJSON();


      // If there isn't a previous account
      //    we'll switch to the new primary
      // If there is a previous account
      //    leave it up to the client to decide whether or not to switch
      if (!reqUser.selectedAccountId) {
        reqUser.selectedAccountId = $newLogin.get('primaryAccountId');
      }

      $newLogin.related('accounts').forEach(function ($acc) {
        // If the associated accounts aren't in the session, add them
        if (!reqUser.accounts.some(function ($a) {
          return $acc.id === $a.id;
        })) {
          reqUser.accounts.push($acc);
        }

        if (!reqUser.$account) {
          if (reqUser.selectedAccountId === $acc.id) {
            reqUser.$account = $acc;
          }
        }
      });

      // TODO remove
      // but first ensure that primaryAccountId is never in disharmony
      if ($newLogin.get('primaryAccountId') && !$newLogin.related('accounts').length) {
        throw new Error('has primary account id, but no accounts');
      }

      // TODO remove
      // but first ensure that selectedAccountId is never in disharmony
      if (reqUser.selectedAccountId && !reqUser.$account) {
        throw new Error('has selected account id with account after loop');
      }

      return $newLogin;
    });
  }

  function serialize(reqUser) {
    return handleNewLogin(reqUser).then(function ($login) {
      // NOTE reqUser.$login === $login
      var sessionIds = { loginIds: [] }
        ;

      // TODO login.uid = appid + realLoginId + accountUuid
      sessionIds.mostRecentLoginId = $login.id;

      sessionIds.loginIds = reqUser.logins.map(function ($l) {
        return $l.id;
      });

      // If this login isn't in the session serialization, add it
      // (I think this should always be true, but... just in case)
      if (-1 === sessionIds.loginIds.indexOf($login.id)) {
        sessionIds.loginIds.push($login.id);
      }

      sessionIds.selectedAccountId = reqUser.selectedAccountId;

      // TODO remove
      // but first make sure the error condition can't actually happen
      if (sessionIds.selectedAccountId && !reqUser.$account) {
        return PromiseA.reject(new Error('has selectedAccountId but no sessionIds.account'));
      }

      return sessionIds;
    });
  }

  Auth = {
    serialize: serialize
  , deserialize: deserialize
  , handleNewLogin: handleNewLogin
  , Logins: Logins
  , Accounts: Accounts
  , LocalLogin: LocalLogin
  , AppLogin: AppLogin
  , Oauth2Login: Oauth2Login
  , AccessTokens: AccessTokens
  };

  return Auth;
};
