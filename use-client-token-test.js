'use strict';

var requestAsync = require('bluebird').promisify(require('request'))
  , accessTokens = 'Qu82qnjr4FVg8OEfgLJjcKeWKQOHgE0KufPfKv1W01WNw-IVeeHShM4JYssgVVFRcmOpbEXV1I317933ZlcsMXH9zciwL92qTHYgHoeOF5HaERKaAAmJzHCu-Dx4m6qdiZkdT7aTmbfL_4Wr98SfNIlIoIA8GEwm9mkTxK0E6XpndzPvINpjIX9q3NEpXvVi_JqcsIFNFpmLVZjMR4D95F_rtNjGXfjnf4WjFInZYCQ26W4XIdLIbvCsUNCSZW07'
  //, accessTokens = 'bad-token'
  ;

return requestAsync({
  url: 'http://local.ldsconnect.org:4004/api/tokeninfo'
, auth: { bearer: accessTokens }
}).spread(function (resp, str) {
  console.log('str');
  console.log(str);
}).catch(function (err) {
  console.error('err.message');
  console.error(err.message);
});
