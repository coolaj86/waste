'use strict';

var merge = require('../lib/permissions').merge
  , lodash = require('lodash')
  , assert = require('assert')
  , current = { scope: {
      'stake.leadership': {
        'group': 'stake.leadership'
      , 'readable': ['name', 'photo']
      , 'executable': ['texting']
      }
    }}
  , added = { scope: {
      'stake.leadership': {
        'group': 'mistake!'
      , 'readable': ['name', 'photo', 'email']
      , 'executable': ['emailing']
      }
    , 'ward.adults': {
        'group': 'ward.adults'
      , 'readable': ['name', 'photo']
      , 'executable': ['calling']
      }
    }}
  , expected = { scope: {
      'stake.leadership': {
        'group': 'stake.leadership'
      , 'readable': ['name', 'photo', 'email']
      , 'executable': ['texting', 'emailing']
      , 'writeable': []
      }
    , 'ward.adults': {
        'group': 'ward.adults'
      , 'readable': ['name', 'photo']
      , 'executable': ['calling']
      , 'writeable': []
      }
    }}
  , merged = merge(current, added)
  , equal
  ;

equal = lodash.isEqual(merged, expected);
if (!equal) {
  console.log('merged', merged);
  console.log('expected', expected);
}
assert.ok(equal);
console.log('PASS');
