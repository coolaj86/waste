'use strict';

var Oauth2 = require('./aj-oauth2')
  , oauth2
  , PromiseA = require('bluebird').Promise
  ;


function clientCredentials() {
  oauth2 = Oauth2.create({
    clientId: 'pub_test_key_1'
  , clientSecret: 'sec_test_secret'
  , state: 'yada X yada Y'
  , scope: 'blah:client::'
  , baseSite: 'http://local.foobar3000.com:4004'
  //, authorizePath: '/oauth2/authorize' // null in example
  , authorizePath: null
  , accessTokenPath: '/oauth/token'
  //, customHeaders: {}
  , customHeaders: null
  });

  return oauth2.getOAuthAccessToken(
    ''
  , { 'grant_type': 'client_credentials' }
  ).then(function (data) {
    return data.accessToken;
    /*
    console.info('[SUCCESS]');
    console.info(
      data.accessToken
    , data.refreshToken
    , data.results
    );
    */
  });
}

function userPassword() {
  oauth2 = Oauth2.create({
    clientId: 'pub_test_key_2'
  //, clientSecret: ''
  , baseSite: 'http://local.foobar3000.com:4004'
  //, authorizePath: '/oauth2/authorize' // null in example
  , authorizePath: null
  , accessTokenPath: '/oauth/token'
  //, customHeaders: {}
  , customHeaders: null
  });

  return oauth2.getOAuthAccessToken(
    ''
  , { 'grant_type': 'password'
    , username: 'user'
    , password: 'super secret'
    , scope: 'blah:root:root:root'
    , state: 'yada A yada B'
    }
  ).then(function (data) {
    return data.accessToken;
  });
}

function failUserPassword() {
  oauth2 = Oauth2.create({
    clientId: 'pub_test_key_2'
  //, clientSecret: ''
  , baseSite: 'http://local.foobar3000.com:4004'
  //, authorizePath: '/oauth2/authorize' // null in example
  , authorizePath: null
  , accessTokenPath: '/oauth/token'
  //, customHeaders: {}
  , customHeaders: null
  });

  return oauth2.getOAuthAccessToken(
    ''
  , { 'grant_type': 'password'
    , username: 'user'
    , password: 'other super secret'
    , scope: 'blah:root:root:root'
    , state: 'yada A yada B'
    }
  ).then(function (data) {
    return data.accessToken;
  });
}

PromiseA.resolve().then(function () {
  return clientCredentials().then(function (token) {
    if (!token) {
      throw new Error("should have successfully gotten grant_type=client_credentials");
    }
  });
}).then(function () {
  return userPassword().then(function (token) {
    if (!token) {
      throw new Error("should have successfully gotten grant_type=password");
    }
  });
}).then(function () {
  return failUserPassword().then(function (token) {
    if (token) {
      throw new Error("badfoo: should not have retrieved grant_type=password");
    }
  }).catch(function (err) {
    if (!/badfoo/.test(err.message)) {
      return;
    }

    console.error('');
    console.error('');
    console.error("FAIL");
    console.error('');
    console.error('');
    console.error(err);
    console.error('');
    console.error('');
    console.error("FAIL");
    console.error('');
    console.error('');
    throw err;
  });
}).then(function () {
  console.log("All tests passed");
});
