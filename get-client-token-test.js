'use strict';

var Oauth2 = require('./aj-oauth2')
  , oauth2
  ;

oauth2 = Oauth2.create({
  clientId: '19c88c7d-0009-4feb-abeb-7bf0a67c25bd'
, clientSecret: '59281e76-6895-48ee-afc9-f69e9d6e384b'
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
