window.StClientConfig = {
  "webhookPrefix": "/webhooks",
  "oauthPrefix": "/oauth",
  "sessionPrefix": "/session",
  "apiPrefix": "/api",
  "snakeApi": true,
  "superUserApi": "/api/superuser",
  "adminApi": "/api/admin",
  "userApi": "/api/user",
  "publicApi": "/api/public"
, "testProfiles": [
    { "role": "superuser"
    , "token": "xxxxxxxx-test-xxxx-xxxx-root-xxxxxx"
    }
  , { "role": "admin"
    , "token": "xxxxxxxx-test-xxxx-xxxx-admin-xxxxxx"
    }
  , { "role": "user"
    , "token": "xxxxxxxx-test-xxxx-xxxx-user-xxxxxxx"
    }
  , { "role": "guest"
    , "token": "xxxxxxxx-test-xxxx-xxxx-guest-xxxxxx"
    }
  ]
, "useSplash": false
, "stripe": {
    "publicKey": "pk_test_hwX1wzG4OMEv9esujApHjxI7"
  , "storeName": "Business Name Here"
  , "storeLogo": null
  }
, "loginProviders": {
    "facebook": "/facebook/connect"
  , "twitter": "/twitter/authn/connect"
  , "tumblr": "/tumblr/connect"
  , "ldsconnect": "/ldsconnect/connect"
  , "loopback": "/loopback/connect"
  }
};
