angular-project-template
============

Install
===

```bash
git clone https://github.com/coolaj86/angular-project-template.git my-project-name
pushd my-project-name/
git remote rename origin upstream

npm install -g yo
npm install -g generator-angular
npm install -g bower

npm install
bower install

grunt build --force

echo '{}' > priv/accounts.priv.json
echo '{}' > priv/users.priv.json
```

Use
===

```bash
grunt build --force
grunt serve

# The --force is in case you don't have compass installed
# If you feel the need for compass, figure out how to install it
# and immediately apply FML relief cream to the affected areas generously
```

Configure
===

For social integration you'll need to edit `config.js` and
replace the demo keys (which only work for `local.ldsconnect.org`) with your own keys and secrets

```bash
# System Startup
mv angular-project.conf /etc/init/my-project-name.conf
vim /etc/init/my-project-name.conf

# Server Config
vim config.js

# Browser Config
vim app/scripts/services/st-api.js
```

## App Name

Edit `./bin/change-app-name.sh` and then run it from the root of the project directory

## SuperUser Secret

Run `./bin/generate-root-secret.js`, then update `config.js` with the output.

## iOS & Android icons

You can hire a designer to create your icon at the largest size,
paste it into these templates,
and then have it in every important size.

* iOS Touch Icon Templates
  * <http://appicontemplate.com/ios7>
  * <http://ios.robs.im/>
* iOS Startup Icon Templates
  * <https://github.com/elistone/ios-splashscreen-template-v2>
* rename script
  * `./bin/rename-app-icons.sh`

How to do:

  * download and open these templates
  * double-click the *edit and save* **icon**
  * paste your image in the *psb*
  * save and close the *psb*
  * select *save for web and devices* in the *psd*
  * tada!

APIs you get for free
===

The external API is configurable to output and accept JSON in either `snake_case` or `camelCase`
with `recase` through middleware in `connect` and `angular`.

The default is to use `snake_case` (ruby style) for JSON.

TODO put option in `./config.js` and `./app/scripts/services/st-api.js`, including exceptions file.

Regardless of how it goes over the wire, both the server-side and browser-side JavaScript
must be written in `camelCase` and will be stored to the database in `snake_case`.

Payments & Credit Cards
------

### GET /api/me/creditcards

response

```
{
}
```

### POST /api/me/creditcards

request

```
{
}
```

response

### POST /api/me/creditcards/:cardid

request

```
{
}
```

response

### DELETE /api/me/creditcards/:cardid

response

```
{
}
```

### Errors

  * "Invalid Card Number"
  * "Card Expired"


Logins and Accounts
---

In this documentation an `account` means an account in your application that the user logs into
whereas a `login` means a login from a 3rd party provider (or yourself) that may access such an account.

### Say What!?

Essentially a `login` is an authentication method that is authorized for one or more `accounts`.


For example:

Google Plus allows one Google+ `login` to control several YouTube `accounts`. You can switch between multiple Google `logins` (say me@work.com and me@gmail.com) and each may manage the same account (say my work social media page).

Buffer and HootSuite allow you to login with any number of `logins` to a single `account` which can cantrol multiple `logins`. However, you manage those same `logins` to login to a different `account`. When I login through the @coolaj86 login I always end up in the same acount - no user switching.

### Authentication and Authorization, Unopinionated

We make no assumptions about how you might want to allow or restrict the sharing of account access among logins.
You can build it out as you wish.

* GET `/api/session`

If you don't implement anything to restrict the linking of logins and accounts you get back an object like this:

```javascript
{
    "selectedAccountId": "xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx",
    "mostRecentLoginId": "facebook:1234567890",
    "accounts": [
        {
            "uuid": "xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx",
            "role": "user",
            "loginIds": [
                "ldsconnect:albusdumbledore"
            ]
        }
    ],
    "logins": [
        // TODO finalize keynames as uid, type, typedUid?
        {
            "id": "facebook:1234567890",
            "typedUid": "facebook:1234567890",
            //"pkey": "facebook:1234567890",
            "type": "facebook",
            //"provider": "facebook",
            "uid": "1234567890",
            "primaryAccountId": "xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx",
            "accoundIds": ["xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx"],
            "guest": true,
            "test": true,
            "emails": [
                {
                    "value": "albus@dumble.dore",
                }
            ]
        }
    ]
}
```

Stripe Payments
---------------

Coming (soon-ish?)

#### `POST /api/session/local`

```bash
curl http://localhost/api/session/local \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "id": "john.doe", "secret": "my secret" }'
```

returns the same as `GET /api/session`

#### `POST /api/session/basic`

```bash
curl http://localhost/api/session/basic \
  -X POST \
  -H 'Authorization: Basic am9obi5kb2U6c2VjcmV0'
```

returns the same as `GET /api/session`

#### `POST /api/session/bearer`

curl http://localhost/api/session/basic \
  -X POST \
  -H 'Authorization: Bearer xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

returns the same as `GET /api/session`

### Facebook Connect et al

Each of these URLs will redirect to the app authentication and or authorization dialog of the specified provider.

Some providers only require authorization once (facebook) and will self-close every time. Others (tumblr) require authorization every single time. Others (twitter) are weird, but we work around the weirdness as best as we can to provide the simplest experience possible.

* GET `/oauth/facebook/connect` redirects to facebook connect (login, permission dialog, or self-closes)
* GET `/oauth/twitter/authn/connect` redirects to twitter authentication and then to twitter authorization, if needed (login, perms, or close)
* GET `/oauth/twitter/authz/connect` redirects to twitter authorization (every time)
* GET `/oauth/tumblr/connect` redirects to tumblr authorization (every time)
* GET `/oauth/ldsconnect/connect` redirects to ldsconnect (same process as facebook)

OAuth Scope
---------------

Since OAuth scope has no standardization, I decided to standardize it.

Scope is setup in the fashion of

```
# group           readable    writeable   executable
<group.subgroup>:[field,...]:[field,...]:[action,...]
```

For Example

```
me.contact:phone,email:email:phone,email,push
me.friends:id::
```

* `group` and `group.subgroup` are contexts of the application
* `readable` means you have access to see the property value (see the real - as opposed to proxied - email address)
* `writable` means you may update the property value (change the email)
* `executable` means you may use the property even if you can read it (a proxied email, or an sms token)

In the first directive I can read actual phone numbers and email addresses, but only update email.
I can't get the device registration id, but I can set a push notification.

In the second I can see the ids of friends, but I can't add new friends (write) or message a friend (execute)

The implementation of how you specify groups and what permissions mean and such is up to you,
but all of the parse and delta logic (showing the user a permission dialog when needing more permissions)
is taken care of.

After much thought and a little bit of implementation,
it seems that this methodology addresses all of the current implementations of scope that are in the wild
and all of my use cases.

If some extension were needed I could see allowing some sort of `xattrs` that my parser ignores and passes
to your own, something like this:

```
xattrs:a-string-for-which-you-implement-your-own-parse-logic
```

But as it stands I don't believe there are any use cases of scope that aren't easy to implement using my
current standard.


Extending
===

New resource
```bash
rsync -avhHP app/views/about.jade /app/views/foo.jade
yo angular:controller foo
yo angular:service foo
```

New Migration
```bash
./bin/new-migration.sh add-field-xyz
vim migrations/2014-05-25_12-00-41_add-field-xyz.js
```
