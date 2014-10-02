'use strict';

var PromiseA = require('bluebird').Promise
  , OAuth = require('oauth')
  , OAuth2 = OAuth.OAuth2
  ;

function create(opts) {
  var oauth2Async
    , oauth2methods = {}
    , oauth2
    ;

  oauth2 = new OAuth2(
    opts.clientId
  , opts.clientSecret
  , opts.baseSite
  , opts.authorizePath
  , opts.accessTokenPath
  , opts.customHeaders
  );

  oauth2Async = PromiseA.promisifyAll(oauth2);
  oauth2methods.getOAuthAccessToken = function (code, params) {
    return oauth2Async.getOAuthAccessTokenAsync(code, params)
      .spread(function (accessToken, refreshToken, results) {
        return { accessToken: accessToken, refreshToken: refreshToken, results: results };
      });
  };

  return oauth2methods;
}

module.exports.create = create;
