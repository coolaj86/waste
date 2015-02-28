* Logins are identified by a secret and some number of contact nodes

* Accounts can only be created with existing logins in the session

### POST /logins/new

Create, and link logins and accounts

```json
  [
    { "nodes": [
        { "type": "username"
        , "node": "coolaj86"
        , "claim": true
        }
      , { "type": "email"
        , "node": "coolaj86"
        , "claim": true
        }
      , { "type": "phone"
        , "node": "+1 (555) 234-6789"
        }
      ]
    , "secret": "supersecret"
    }
  ]
```

* contact nodes with claims can be used for login
* unclaimed nodes can be used for recovery, but not login
* you **WILL NOT** be able to login with a node unless it has been claimed
* claiming requires verification via email, sms, etc

### POST /accounts/new

```json
  [
    { "account": { "foo": "bar" }
    , "logins": [ { "id": "an-id-in-your-session"  } ]
    }
  ]
}
```

* New accounts will be created with supplied extra keys (if allowed)

### POST /accounts/:accountid

TODO Update allowed keys

* Delete keys by specifying null

### POST /logins/

TODO Create OAuth tokens as logins

TODO Create email verification as login

TODO Create sms verification as login

### POST /logins/:loginid

TODO Update allowed keys

TODO Change password

* Delete keys by specifying null

TODO add alias (phone -> uid, email -> uid)

### DELETE /accounts/:loginid/:accountid

There is no way to "delete" accounts or "logins", just to unlink them (since other resources may still link to them).

Removing all logins from an account will make it deleted-ish (or at least hard to use)

Hmm... or maybe we just shouldn't allow accounts to be completely unlinked.
