

    /*
    function autolink() {
      // don't autolink accounts
      if (!sessionObj.selectedAccountId) {
        console.log('[auth-logic] NO ACCOUNT PRESENT');
        return;
      }

      console.log('[auth-logic] FOUND ACCOUNT');

      account = Accounts.select(sessionObj.selectedAccountId, sessionObj.accounts);
      sessionObj.account = account;

      if (!account) {
        // this should never happen
        console.error('ERROR: got a selectedAccountId with no related account');
        console.error(sessionObj);
        return;
      }

      //Accounts.linkLogins(account, login);
      Logins.linkAccounts(login, account);
      console.log('account, loginObj');
      console.log(account);
      console.log(loginObj);

      finish();
    }
    */



    /*
    opts.Auth.Logins.get('local', clientId, clientSecret, function (err, login, idAvailable) {

      // TODO this is also in sessionlogic/local, needs to be factored out
      //
      function setPrimaryAccount(account, login) {
        [login].forEach(function (l) {
          console.log('login');
          console.log(l);
          if (!l.primaryAccountId) {
            opts.Auth.Logins.setPrimaryAccount(l, account);
          }
        });
      }

      function createNewAccount() {
        var meta = {}
          ;

        setMeta(meta, {});
        opts.Auth.Accounts.create([login.id], meta, function (account) {
          mergeExistingAccount(account, login);
        });
      }

      function mergeExistingAccount(account) {
        setMeta(account, {});
        opts.Auth.Accounts.attachLogin(account, login);
        setPrimaryAccount(account, login);
        done(err, login);
      }

      function setMeta(meta, other) {
        Object.keys(other).forEach(function (k) {
          meta[k] = other[k];
        });

        if (!meta.localLoginId && /local/.test(login.id)) {
          meta.localLoginId = login.id;
        } else if (meta.localLoginId && !/local/.test(login.id)) {
          meta.localLoginId = null;
        }
      }
      //
      // END

      if (!login && idAvailable) {
        var secretHash = require('./utils').createSecretHash(clientSecret)
          ;

        opts.Auth.Logins.login({
          type: 'local'
        , uid: clientId
        , public: {
            id: clientId
          , provider: 'local'
          }
        , salt: secretHash.salt
        , secret: secretHash.secret
        , hashtype: secretHash.type
        }).then(function (_login) {
          login = _login;
          createNewAccount();
        });
        return;
      }

      done(err, login);
    });
    */
