angular-project-template
============

Install
===

```bash
git clone https://github.com/coolaj86/angular-project-template.git my-project-name
pushd my-project-name/
git remote rename origin upstream

npm install -g yo generator-angular bower
npm install -g jshint jade

npm install
bower install

# In the world of rainbows and fairies, this would work as is - simple.
# However, it often requires installing rvm and bundler and modifying environment variables,
# and the immediate need for FML relief cream applied generously to the affected areas
# I actually don't even use compass and I'd prefer to use less, but it was in the grunt template
# and I haven't rooted it out yet, so feel free to pull request.
sudo gem install compass 

grunt build
```

Use
===

```bash
grunt build
grunt serve

# Note that the application source is in ./app
# but the built version is served from ./dist (and sometimes parts leftover in ./tmp)
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
Use `?camel=true` to prevent conversion to snake case.

TODO put option in `./config.js` and `./app/scripts/services/st-api.js`, including exceptions file.

Regardless of how it goes over the wire, both the server-side and browser-side JavaScript
must be written in `camelCase` and will be stored to the database in `snake_case`.

Device Registration
------

### POST /api/me/devices

request

```javascript
{
  "token": "tok_abc123" // the device's uuid or leave blank to auto assign 
, "agent": {
      "family": "Firefox"
    , "major": "31"
    , "minor": "0"
    , "patch": "0"
    , "device": {
        "family": "Other"
      , "major": ""
      , "minor": ""
      , "patch": ""
    }
    , "os": {
        "family": "Mac OS X"
      , "major": "10"
      , "minor": "9"
      , "patch": ""
      , "version": "10.9"
    }
    , "version": "31.0.0"
    , "osversion": "10.9"
    , "enable_device_notifications": true
  }
}
```

response

```javascript
// an array of all devices in the format above
```

try it

```bash
curl http://local.ldsconnect.org:4004/api/me/devices \
  -X POST
  -H "Authorization: Bearer 1-7T2" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"agent":{"family":"Firefox","major":"31","minor":"0","patch":"0","device":{"family":"Other","major":"","minor":"","patch":""},"os":{"family":"Mac OS X","major":"10","minor":"9","patch":"","version":"10.9"},"version":"31.0.0","osversion":"10.9"},"enable_push":true}'
```

### POST /api/me/devices/:token

request

:token The device's uuid

Then any updates to the device

```javascript
{
, "agent": {
      "family": "Firefox"
    , "major": "31"
    , "minor": "0"
    , "patch": "0"
    , "device": {
        "family": "Other"
      , "major": ""
      , "minor": ""
      , "patch": ""
    }
    , "os": {
        "family": "Mac OS X"
      , "major": "10"
      , "minor": "9"
      , "patch": ""
      , "version": "10.9"
    }
    , "version": "31.0.0"
    , "osversion": "10.9"
    , "enable_device_notifications": false
  }
}
```

response

```javascript
// an array of all devices in the format above
```

try it

```bash
curl http://local.ldsconnect.org:4004/api/me/devices/card_abc123 \
  -H "Authorization: Bearer 1-7T2" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"agent":{"family":"Firefox","major":"31","minor":"0","patch":"0","device":{"family":"Other","major":"","minor":"","patch":""},"os":{"family":"Mac OS X","major":"10","minor":"9","patch":"","version":"10.9"},"version":"31.0.0","osversion":"10.9"},"enable_push":false}'
```

### GET /api/me/devices/

response

```javascript
// an array of all devices in the format above
```

try it

```bash
curl http://local.ldsconnect.org:4004/api/me/devices/ \
  -H "Authorization: Bearer 1-7T2"
```

### GET /api/me/devices/:token

request

:token  The uuid of the device to fetch

response

```javascript
// a single device in the format above
```

try it

```bash
curl http://local.ldsconnect.org:4004/api/me/devices/tok_abc123 \
  -H "Authorization: Bearer 1-7T2"
```

Payments & Credit Cards
------

### GET /api/me/payment-methods

Get a list of all credit card tokens. The credit cards are attached to the account object
as creditcards, so this method may not be needed.

response

```
[
  {
    "cardService": "stripe"
  , "id": "tok_abc123",
  , "livemode": false,
  , "created": 1405813253,
  , "used": false,
  , "object": "token",
  , "type": "card",
  , "card": 
    {
      "id": "card_abc123",
    , "object": "card",
    , "last4": "1111",
    , "brand": "Visa",
    , "funding": "unknown",
    , "exp_month": 4,
    , "exp_year": 2018,
    , "fingerprint": "abc123",
    , "country": "US",
    , "name": "Cardholder Name",
    , "address_line1": null,
    , "address_line2": null,
    , "address_city": null,
    , "address_state": null,
    , "address_zip": "12345",
    , "address_country": null,
    , "customer": "cus_abc123"
  }
  ...
]
```

try it

```bash
curl http://local.ldsconnect.org:4004/api/me/payment-methods \
  -H "Authorization: Bearer 1-7T2"
```

### POST /api/me/payment-methods

Add a new payment method (currently only supports Stripe credit card tokens)

request

```
  {
    "cardService": "stripe"
  , "id": "tok_abc123"
  , "livemode": false
  , "created": 1405813253
  , "used": false
  , "object": "token"
  , "type": "card"
  , "card": 
    {
      "id": "card_abc123"
    , "object": "card"
    , "last4": "1111"
    , "brand": "Visa"
    , "funding": "unknown"
    , "exp_month": 4
    , "exp_year": 2018
    , "fingerprint": "abc123"
    , "country": "US"
    , "name": "Cardholder Name"
    , "address_line1": null
    , "address_line2": null
    , "address_city": null
    , "address_state": null
    , "address_zip": "12345"
    , "address_country": null
    , "customer": "cus_abc123"
    }
  }
```

response - the card

```javascript
{ 
  "id": "card_abc123"
, "object": "card"
, "last4": "4242"
, "brand": "Visa"
, "funding": "credit"
, "exp_month": 5
, "exp_year": 2017
, "fingerprint": "abc123"
, "country": "US"
, "name": null
, "address_line1": null
, "address_line2": null
, "address_city": null
, "address_state": null
, "address_zip": null
, "address_country": null
, "cvc_check": "pass"
, "address_line1_check": null
, "address_zip_check": null
, "customer": "cus_abc123" 
}
// OR
{
  "error": { "message": "Error message here" }
}
```

try it

```bash
curl http://local.ldsconnect.org:4004/api/me/payment-methods \
  -X POST
  -H "Authorization: Bearer 1-7T2" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"cardService":"stripe","id":"tok_abc123","livemode":false,"created":1405813253,"used":false,"object":"token","type":"card","card":{"id":"card_abc123","object":"card","last4":"1111","brand":"Visa","funding":"unknown","exp_month":4,"exp_year":2018,"fingerprint":"abc123","country":"US","name":"Cardholder Name","address_line1":null,"address_line2":null,"address_city":null,"address_state":null,"address_zip":"12345","address_country":null,"customer":"cus_abc123"}}'
```

### POST /api/me/payment-methods/:cardId/preferred

Set a card as the preferred card given the card id. Note that when you look at an item in the creditcards
array, it is a token not a card. To access the id, use token.card.id.

request

:cardId - the string id of the card

response

```javascript
{
  "success": true
}
// OR
{
  "error": { "message": "Error message here" }
}
```

try it

```bash
curl http://local.ldsconnect.org:4004/api/me/payment-methods/card_abc123/preferred \
  -X POST
  -H "Authorization: Bearer 1-7T2"
```


### DELETE /api/me/payment-methods/:cardId

Delete a card token given the card id. Note that when you look at an item in the creditcards
array, it is a token not a card. To access the id, use token.card.id.

request

:cardId - the string id of the card

response

```javascript
{
  "error": { "message": "Error message here" }
}
```

try it

```bash
curl http://local.ldsconnect.org:4004/api/me/payment-methods/card_abc123 \
  -X DELETE
  -H "Authorization: Bearer 1-7T2"
```

### Errors

  * "Invalid Card Number"
  * "Card Expired"


Logins vs Accounts vs Session
-----------------------------

Waste is the first system to properly decouple Logins, Accouns, and Sessions.

In this documentation **Login** refers to an authentication (**AuthN**) mechanism
such as a username+passphrase, id+secret, or Facebook Connect whereas
**Account** refers to a set of privileges
and authorizations (**AuthZ**) that the user has access to.


**Philosophy**:
This design is to facilitate multiple login and multiple account scenarios
such as husband and wife or business partners who prefer to share
an account as well as scenarios where a person may have separate accounts
for various businesses, but doesn't wish to create multiple logins.

### Unopinionated

The implementation provides the clear separation of concerns, but does not
enforce any particular scenario. Reasonable defaults and examples are provided,
but you can have complete control over delivering the experience that your users deserve.

### Case Studies

Google Plus allows one Google+ `login` to control several YouTube `accounts`. You can switch between multiple Google `logins` (say me@work.com and me@gmail.com) and each may manage the same account (say my work social media page).

Buffer and HootSuite allow you to login with any number of `logins` to a single `account`
which can cantrol multiple oauth profiles.
However, you manage those same `logins` to login to a different `account`.
When I login through the @coolaj86 login I always end up in the same acount - no user switching.

Logins
------

### Social Connect (Facebook et al)

Each of these URLs will redirect to the app authentication and or authorization dialog of the specified provider.

Some providers only require authorization once (facebook) and will self-close every time.
Others (tumblr) require authorization every single time.
Others (twitter) are weird, but we work around the weirdness as best as we can to provide the simplest experience possible.

* GET `/oauth/facebook/connect` redirects to facebook connect (login, permission dialog, or self-closes)
* GET `/oauth/twitter/authn/connect` redirects to twitter authentication and then to twitter authorization, if needed (login, perms, or close)
* GET `/oauth/twitter/authz/connect` redirects to twitter authorization (every time)
* GET `/oauth/tumblr/connect` redirects to tumblr authorization (every time)
* GET `/oauth/ldsconnect/connect` redirects to ldsconnect (same process as facebook)

#### Create User

POST `/api/logins`

```json
{ "uid": "user"
, "secret": "super secret"
}
```

This will first attempt a login and only create the user if the login fails.

#### Login / Create User Session

POST `/api/session/basic`

```
Authorization: Basic dXNlcjpzZWNyZXQ=
```

This will add the login to the current session using HTTP Basic Auth.

#### Check User Existance

GET `/api/logins?uid=<uid>`

```json
{ "exists": true }
```

NOTE 3rd party apps should not use this resource.

#### Update Login

Currently the only available resource to update is the primaryAccountId.

```
POST /api/logins/:hashid

{ "primaryAccountId": "an-id-already-associated-with-this-login"
, "mostRecentAccountId": "an-id-already-associated-with-this-login"
}
```

```
{ "success": true }
```

If you would like to add a login to an account, you must add it to the account resource first.

#### Update Secret (Password / Passphrase)

```
POST /api/logins/:hashid/secret

{ "uid": "foouser"
, "secret": "my-current-secret"
, newSecret: "my-new-secret"
}
```

```
{ "success": true }
```

BUG this action does not yet send push notifications to the user about the password change.

Session
-------

#### Get Current Session

* GET `/api/session`

If you don't implement anything to restrict the linking of logins and accounts you get back an object like this:

```javascript
{
    "mostRecentLoginId": "xxxxxxxx-0123-4xxx-abcd-xxxxxxxxxxxx",
    "accounts": [
        {
            "uuid": "xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx",
            "role": "user",
            "logins": [
              { "provider": "facebook"
              , "id": "xxxxxxxx-0123-4xxx-abcd-xxxxxxxxxxxx"
              }
            ]
        }
    ],
    "logins": [
        // TODO finalize keynames as uid, type, typedUid?
        {
            "id": "1234567890adcdef",
            "provider": "facebook",
            "primaryAccountId": "xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx",
            "mostRecentAccountId": "xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx",
            "accountIds": ["xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx"],
            "test": true,
            "contactnodes": [
              {
                "value": "albus@dumble.dore",
              , "type": "email"
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

Scope
====

See <https://github.com/coolaj86/wasteful-scope>.

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
