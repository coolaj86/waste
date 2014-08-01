'use strict';

var delta = require('../lib/permissions')._delta
  , lodash = require('lodash')
  , assert = require('assert')
  , current = { scope: {
      'stake.leadership': {
        'group': 'stake.leadership'
      , 'readable': ['name', 'photo']
      , 'executable': ['texting']
      }
    , 'stake.members': {
        'group': 'stake.members'
      , 'readable': ['name', 'photo']
      }
    }}
  , requested = { scope: {
      // different
      'stake.leadership': {
        'group': 'mistake!'
      , 'readable': ['name', 'photo', 'email']
      , 'executable': ['emailing']
      }
      // new
    , 'ward.adults': {
        'group': 'ward.adults'
      , 'readable': ['name', 'photo']
      , 'executable': ['calling']
      }
      // no change
    , 'stake.members': {
        'group': 'stake.members'
      , 'readable': ['name', 'photo']
      }
    }}
  , expected = { scope: {
      'stake.leadership': {
        'group': 'stake.leadership'
      , 'readable': ['email']
      , 'executable': ['emailing']
      }
    , 'ward.adults': {
        'group': 'ward.adults'
      , 'readable': ['name', 'photo']
      , 'executable': ['calling']
      }
    }}
  , delta = delta(current, requested)
  , equal
  ;

equal = lodash.isEqual(delta, expected);
if (!equal) {
  console.log('delta', delta);
  console.log('expected', expected);
}
assert.ok(equal);
console.log('PASS');
