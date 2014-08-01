### POST /accounts

Create, and link logins and accounts

```json
{ "logins": [
    { "id": "an-id-in-your-session" }
  , { "uid": "coolaj86", "secret": "supersecret", "bar": "this login will be created", "garply": null }
  ]
, "accounts": [
    { "id": "an-id-in-your-session" }
  , { "grault": "this will create a new account. both of these accounts will be attached to both logins" }
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
