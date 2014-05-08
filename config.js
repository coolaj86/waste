'use strict';
// All of these keys are valid working keys registered to
// "Hogwarts Test Application" at http://local.ldsconnect.org,
// which points to 127.0.0.1 for your testing pleasure.
//
// NOTE: grunt automatically serves pages from localhost:9003 which WILL NOT WORK
//
// YOU MUST point your browser to local.ldsconnect.org:9003 or YOU WILL HATE YOUR LIFE
// and spend hours debugging a problem that doesn't exist
// (I've cumulatively wasted nearly a full day of my life on such imagined problems)
//
module.exports = {
  protocol: 'http'
, hostname: 'local.ldsconnect.org'
, port: 4004
, get host() {
    if (
        'http' === this.protocol && '80' === this.port.toString()
      ||'https' === this.protocol && '443' === this.port.toString()
    ) {
      return this.hostname;
    }

    return this.hostname + ':' + this.port;
  }
, get href() {
    return this.protocol + '://' + this.host;
  }
, wsport: 4204
  // the default secret is 'super secret',
  // run `node ./generate-root-secret` to create a new one
, rootUser: {
    id: 'root'
  , salt: "UdVsog0lLYCV1x2mMAGZa6x+7W41xqtTyR4PLZpE8Pc="
  , secret: "7e0e7d6fbb948279f204a8a85f1bee10"
  , type: "md5"
  }
, sessionSecret: 'a super secret for ITS, nothing better'
, facebook: {
    // https://developers.facebook.com/apps
    // Client Token 5308ba111a46159e92d74fce76dbe807
    // Test User Email: hogwarts_ogszoxx_user@tfbnw.net
    // Test User Password: secret
    // Test User ID: 100007933814002
    id: '259725070873272'
  , secret: 'd8469a2af25d6b806014be4be272b909'
  }
, twitter: {
    // https://dev.twitter.com/apps
    // default callback /authn/twitter/callback
    consumerKey: 'eLWtqMMGZr1CQC6Wk3tO7g'
  , consumerSecret: 'auhIHIbopDBmXuQizGEINLlGePdqDEd5QgDzvG4CCik'
  }
, ldsconnect: {
    // http://ldsconnect.org
    // Test User Name: dumbledore
    // Test User Password: secret
    id: '55c7-test-bd03'
  , secret: '6b2fc4f5-test-8126-64e0-b9aa0ce9a50d'
  }
, stripe: {
    // https://manage.stripe.com/account/apikeys
    id: "pk_test_526DRmZwEOiMxTigV5fX52ti"
  , secret: "sk_test_Erl9x9947vVPaYigTyKKuXZl"
  }
, tumblr: {
    // https://www.tumblr.com/settings/apps
    // http://www.tumblr.com/oauth/apps
    // default callback /auth/tumblr/callback
    consumerKey: 'b0ix4BsnbExgzi8zf0mmowj8k9g36YqwP5uBUOLoyxYoqBTlD8'
  , consumerSecret: 'FhnXG8TPhQ3xl4xTtfDaCsgAOHHsg7QHUQzmqPmeMcrSjS4CQU'
  }
};
