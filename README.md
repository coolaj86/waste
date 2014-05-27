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
vim config.js
mv angular-project.conf /etc/init/my-project-name.conf
vim /etc/init/my-project-name.conf
```

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
  * `./rename-app-icons.sh`

How to do:

  * download and open these templates
  * double-click the *edit and save* **icon**
  * paste your image in the *psb*
  * save and close the *psb*
  * select *save for web and devices* in the *psd*
  * tada!

APIs you get for free
===

Accounts and Profiles
---

In this documentation an `account` means an account in your application that the user logs into
whereas a `profile` (aka login) means a profile from a 3rd party provider (or yourself) that may access such an account.

### Say What!?

Essentially a `profile` is an authentication method that is authorized for one or more `accounts`.


For example:

Google Plus allows one Google+ `profile` to control several YouTube `accounts`. You can switch between multiple Google `profiles` (say me@work.com and me@gmail.com) and each may manage the same account (say my work social media page).

Buffer and HootSuite allow you to login with any number of `profiles` to a single `account` which can cantrol multiple `profiles`. However, you manage those same `profiles` to login to a different `account`. When I login through the @coolaj86 profile I always end up in the same acount - no user switching.

### Authentication and Authorization, Unopinionated

We make no assumptions about how you might want to allow or restrict the sharing of account access among profiles.
You can build it out as you wish.

* GET `/api/session`

If you don't implement anything to restrict the linking of profiles and accounts you get back an object like this:

```javascript
{
    "currentAccountId": "xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx", // TODO
    "currentLoginId": "facebook:1234567890",
    // TODO maybe rename login -> profile
    "currentProfileId": "facebook:1234567890",
    "accounts": [
        {
            "uuid": "xxxxxxxx-test-4xxx-user-xxxxxxxxxxxx",
            "loginIds": [
                "ldsconnect:albusdumbledore"
            ]
        }
    ],
    // TODO or maybe rename profiles -> logins
    "profiles": [
        {
            "id": "1234567890",
            "guest": true,
            "test": true,
            "emails": [
                {
                    "value": "albus@dumble.dore",
                }
            ],
            "provider": "facebook",
            "pkey": "facebook:1234567890"
        }
    ]
}
```

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

* GET `/api/auth/facebook` redirects to facebook connect (login, permission dialog, or self-closes)
* GET `/api/authn/twitter` redirects to twitter authentication and then to twitter authorization, if needed (login, perms, or close)
* GET `/api/authz/twitter` redirects to twitter authorization (every time)
* GET `/api/auth/tumblr` redirects to tumblr authorization (every time)
* GET `/api/auth/ldsconnect` redirects to ldsconnect (same process as facebook)

Extending
===

New resource
```bash
rsync -avhHP app/views/about.jade /app/views/foo.jade
yo angular:controller foo
yo angular:service foo
```
