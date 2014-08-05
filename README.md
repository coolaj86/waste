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

### POST /api/me/creditcards

Add a new credit card

request

```
  {
    "cardService": "stripe"
  , "card": 
    {
      "number": "4111111111111111"
    , "name": "Cardholder Name"
    , "exp_month": 4,
    , "exp_year": 2018,
    , "cvc": "123",
    , "address_line1": "123 Anystreet", // optional
    , "address_line2": "Apt 101", // optional
    , "address_city": "Anytown", // optional
    , "address_zip": "12345", // optional
    , "address_state": "NY", // optional
    , "address_country": "US", // optional
  }
```

response - the card

```javascript
{ 
  "id": "card_14NvdC2eZvKYlo2C9zySiKnW"
, "object": "card"
, "last4": "4242"
, "brand": "Visa"
, "funding": "credit"
, "exp_month": 5
, "exp_year": 2017
, "fingerprint": "Xt5EWLLDS7FJjR1c"
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
, "customer": "cus_4WzcnFywIav3jX" 
}
// OR
{
  error: "Error message here"
}
```

### POST /api/me/creditcards/:cardId/preferred

Set a card as the preferred card given the card id. Note that when you look at an item in the creditcards
array, it is a token not a card. To access the id, use token.card.id.

request

:cardId - the string id of the card

response

```javascript
{
  "error":"An error message or null"
}
```

### DELETE /api/me/creditcards/:cardId

Delete a card token given the card id. Note that when you look at an item in the creditcards
array, it is a token not a card. To access the id, use token.card.id.

request

:cardId - the string id of the card

response

```javascript
{
  "error":"An error message or null"
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
