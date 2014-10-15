'use strict';

angular.module('yololiumApp')
  .service('StSession', ['$http', '$q', '$timeout', 'StLogin', 'StAccount', 'StApi', function StSession($http, $q, $timeout, StLogin, StAccount, StApi) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var me = this || {}
      , shared = { session: null, touchedAt: 0 }
      , gettingSession = null
      , noopts = {}
      , notifier = $q.defer()
      , apiPrefix = StApi.apiPrefix
      ;

    // TODO move this to server (and make it real)
    function mangle(data) {
      if (!data || data.error) {
        return data;
      }

      data.loginsMap = {};
      data.logins.forEach(function (l) {
        data.loginsMap[l.id] = l;
      });
      data.login = data.loginsMap[data.mostRecentLoginId];
      /*
      data.logins.some(function (l) {
        if (l.id === data.mostRecentLoginId) {
          data.login = l;
          return true;
        }
      });
      */

      data.accountsMap = {};
      data.accounts.forEach(function (a) {
        data.accountsMap[a.id] = a;
      });

      data.account = data.accountsMap[data.selectedAccountId] || data.accounts[0];
      if (!data.account) {
        data.logins.forEach(function (login) {
          data.accounts.some(function (account) {
            if (account.id === login.primaryAccountId) {
              data.account = account;
              return true;
            }
          });
        });
      }

      // TODO show a UI to choose an account
      if (!data.account) {
        data.account = data.accounts[0];
      }
      /*
      data.accounts.some(function (a) {
        if (a.id === data.selectedAccountId) {
          data.account = a;
          return true;
        }
      });
      */

      data.account = data.account || {};
      data.account.role = data.account.role || (data.account.id && 'user') || 'guest';
      data.connected = {};
      data.account.loginIds = data.account.loginIds || [];
      data.account.loginIds.forEach(function (typedUid) {
        var parts = typedUid.split(':')
          , type = parts.shift()
          , uid = parts.join(':')
          ;

        // TODO carry more info about logins in account
        data.connected[type] = data.connected[type] || {};
        data.connected[type][uid] = data.loginsMap[typedUid] || {
          type: type
        , uid: uid
        , typedUid: typedUid
        , id: typedUid
        };
      });

      if (data.account.id && 'guest' === data.account.role) {
        data.account.role = 'user';
      }

      return data;
    }

    function read(opts) {
      opts = opts || noopts;
      var d = $q.defer()
        , staletime = 5 * 60 * 60 * 1000
        ;

      if (opts.expire || (Date.now() - shared.touchedAt > staletime)) { // also try Date.now() - shared.session.touchedAt
        gettingSession = null;
        shared.session = null;
      }

      if (gettingSession) {
        return gettingSession;
      }

      gettingSession = d.promise;

      if (shared.session) {
        $timeout(function () {
          // premangled
          d.resolve(shared.session);
        }, 0);
        return gettingSession;
      }

      $http.get(apiPrefix + '/session').success(function (_userSession) {
        me.created = me.created || Date.now();
        me.updated = Date.now();

        //console.log('_userSession', _userSession);
        update(_userSession);
        //shared.session = mangle(_userSession);
        //shared.touchedAt = Date.now();
        d.resolve(shared.session);
      });

      return gettingSession;
    }

    function create(email, passphrase) {
      var d = $q.defer()
        ;

      $http.post(apiPrefix + '/session', {
        email: email
      , password: passphrase
      }).success(function (data) {
        d.resolve(mangle(data));
      });

      return d.promise;
    }

    // external auth (i.e. facebook, twitter)
    function update(session) {
      gettingSession = null;

      shared.session = mangle(session);
      shared.touchedAt = Date.now();
      // TODO Object.freeze (Mozilla's deepFreeze example)
      notifier.notify(shared.session);
      return shared.session;
    }

    /*
    function addAccount() {
      var account = session && session.account
        ;

      if (!account || !account.id || account.error) {
        console.error('ERROR updating account');
        console.error(account);
        return;
      }

      // TODO do these account adjustments in StSession
      if (!mySession.accounts.some(function (a) {
        return a.id === account.id;
      })) {
        mySession.accounts.push(account);
      }

      mySession.selectedAccountId = account.id;
    }
    */

    function subscribe(fn, scope) {
      if (!scope) {
        // services and such
        notifier.notify(shared.session);
        return;
      }

      // This is better than using a promise.notify
      // because the watches will unwatch when the controller is destroyed
      scope.__stsessionshared__ = shared;
      scope.$watch('__stsessionshared__.session', function () {
        fn(shared.session);
      }, true);
    }

    function destroy() {
      var d = $q.defer()
        ;

      console.log('DESTROYING SESSION');
      console.log(shared);
      shared.session = null;
      gettingSession = null;
      $http.delete(apiPrefix + '/session').success(function (resp) {
        shared.session = null;
        gettingSession = null;
        update(resp.data);
        d.resolve(resp.data);
      });
      return d.promise;
    }

    // TODO if a login is successful, don't we always want to replace the current session?
    // TODO if a login fails, don't we always want to keep the previous session?
    //  guest -> guest
    //  user -> user
    function makeLogins(scope, cb) {
      Object.keys(StApi.loginProviders).forEach(function (key) {
        makeLogin(scope, key, StApi.oauthPrefix + StApi.loginProviders[key], cb);
      });
    }
    function makeLogin(scope, key, authUrl, cb) {
      var uKey = key.replace(/(^.)/, function ($1) { return $1.toUpperCase(); })
        , promise = promiseLogin(uKey, authUrl)
        ;

      // TODO code smell - this sholud be a directive
      scope['loginWith' + uKey + ''] = function () {
        promise().then(function (data) {
          cb(null, data);
        }, function (err) {
          cb(err);
        });
      };
    }

    function promiseLoginsInScope(scope, prefix, resolve, reject) {
      promiseLogins().forEach(function (obj) {
        scope[prefix + obj.uKey] = function () {
          obj.login().then(resolve, reject);
        };
      });
    }
    function promiseLogins() {
      var logins = []
        ;

      Object.keys(StApi.loginProviders).forEach(function (key) {
        var uKey = key.replace(/(^.)/, function ($1) { return $1.toUpperCase(); })
          ;

        logins.push({
          key: key
        , uKey: uKey
        , login: promiseLogin(key, StApi.oauthPrefix + StApi.loginProviders[key])
        });
        //scope['loginWith' + uKey + ''] = ;
      });

      return logins;
    }
    function promiseLogin(abbr, authUrl) {
      var d = $q.defer()
        , uAbbr = abbr.replace(/(^.)/, function ($1) { return $1.toUpperCase(); })
        , login = {}
        ;

      login['poll' + uAbbr + 'Login'] = function () {
        //jQuery('body').append('<p>' + 'heya' + '</p>');
        console.log('[debug]', 'poll' + uAbbr + 'Login');
        if (!window.localStorage) {
          clearInterval(login['poll' + uAbbr + 'Int']);
          // doomed!
          return;
        }

        if (localStorage.getItem(abbr + 'Status')) {
          window['complete' + uAbbr + 'Login'](localStorage.getItem(abbr + 'Status'));
        }
      };
      window['complete' + uAbbr + 'Login'] = function (url, accessToken, email, link) {
        var err = null
          ;

        if (/deny|denied/i.test(url)) {
          err = new Error('Access Denied: ' + url);
        } else if (/error/i.test(url)) {
          err = new Error('Auth Error: ' + url);
        }

        console.log('[debug]', 'complete' + uAbbr + 'Login');
        clearInterval(login['poll' + uAbbr + 'Int']);
        localStorage.removeItem(abbr + 'Status');
        login.loginCallback(err);

        console.log('accessed parent function complete' + uAbbr + 'Login', accessToken, email, link);
        //jQuery('body').append('<p>' + url + '</p>');
        login.loginWindow.close();
        delete login.loginWindow;
      };

      //scope['loginWith' + uAbbr + ''] = 
      function tryToLogin() {
        console.log('[debug]', 'loginWith' + uAbbr + '');
        login.loginCallback = function (err) {
          console.log('[st-session.js] promiseLogin loginCallback');
          if (err) {
            d.reject(err);
            return;
          }

          console.log('[st-session.js] promiseLogin StSession.read()');
          read({ expire: true }).then(function (session) {
            console.log('[st-session.js] promiseLogin StSession.read() callback');
            if (session.error) {
              console.error('error in session');
              console.error(session);
              destroy();
            }
            d.resolve(session);
          });
        };

        console.info('[TODO] allow arbitrary scope requests on login and permission upgrade');
        login.loginWindow = login.loginWindow || window.open(authUrl + '?scope=me:phone::');
        login['poll' + uAbbr + 'Int'] = setInterval(login['poll' + uAbbr + 'Login'], 300);

        return d.promise;
      }

      return tryToLogin;
    }

    function ensureSession(opts) {
      // TODO 'admin' -> 'You must be an admin to access this page'
      // TODO such a login should not link to the current account, if any
      function checkSession(session) {
        //console.log('[st-session.js] checkSession', session);
        // pass in just login?
        return StLogin.ensureLogin(session, opts).then(function (session2) {
          console.log('[st-session.js] ensureLogin callback');
          update(session2);
          console.log('[st-session.js] ensureLogin update', shared.session);
          // pass in just account?
          return StAccount.ensureAccount(shared.session, opts).then(function () {
            console.log('[st-session.js] ensureAccount callback');
            return shared.session;
          });
        });
      }

      return read().then(checkSession, checkSession);
    }

    var x = {
      get: read
    , create: create
    , read: read
    , update: update
    , destroy: destroy
    , subscribe: subscribe
    , oauthPrefix: StApi.oauthPrefix
    , ensureSession: ensureSession
    , makeLoginsInScope: makeLogins
    , makeLogins: makeLogins
    , promiseLogins: promiseLogins
    , promiseLoginsInScope: promiseLoginsInScope
    , makeLogin: makeLogin
    };

    Object.keys(x).forEach(function (k) {
      me[k] = x[k];
    });

    return me;
  }]);
