'use strict';

var Oauth2 = require('./aj-oauth2')
  , oauth2
  ;

oauth2 = Oauth2.create({
  clientId: 'pub_test_key_1'
, clientSecret: 'sec_test_secret'
, baseSite: 'http://local.foobar3000.com:4004'
//, authorizePath: '/oauth2/authorize' // null in example
, authorizePath: null
, accessTokenPath: '/oauth/token'
//, customHeaders: {}
, customHeaders: null
});

console.info('[oauth2]');
console.info(oauth2);

oauth2.getOAuthAccessToken(
  ''
, { 'grant_type': 'client_credentials' }
).then(function (data) {
  console.info('[SUCCESS]');
  console.info(
    data.accessToken
  , data.refreshToken
  , data.results
  );
}).error(function (err) {
  console.error("ERROR getOAuthAccessToken");
  console.error(err);
}).catch(function (err) {
  console.error("THROWN");
  console.error(err);
});
