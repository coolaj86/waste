'use strict';

var stringify = require('../lib/permissions').stringify
  , parse = require('../lib/permissions').parse
  , obj = { scope: parse(['stake.leadership:name,photo:phone:texting']).scopes }
  , msgs
  ;

console.log(JSON.stringify(obj, null, '  '));
msgs = stringify(obj);
console.log(msgs);

console.log('\n\n');

obj = { scope: parse([
  'stake.adults:name,photo,phone,email::texting,emailing'     // all non-minors in a ward
, 'stake.leadership:name,photo,phone,email::texting,emailing'
]).scopes };
console.log(JSON.stringify(obj, null, '  '));
msgs = stringify(obj);
console.log(msgs);
