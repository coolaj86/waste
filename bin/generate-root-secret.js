#!/usr/bin/env node
'use strict';

var util = require('util')
  , secretUtils = require('../lib/sessionlogic/utils')
  ;

util.puts("You shouldn't store your user id and secret in a config file.");
util.puts("Enter a secret here and you will be given the 'admin' config");
util.puts("");
util.print('enter a new secret: ');

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
  var secret = chunk.toString()
    ;

  secret = secret.replace(/[\n\r]+$/, '');

  console.log("\nHere's your sanatized secret:\n");
  console.log(JSON.stringify(secretUtils.createSecretHash(secret), null, '  '));

  console.log("\nAnd here's how that was created for you:\n");
  console.log(secretUtils.createSecretHash.toString());

  console.log("\nCopy, Paste, Season to Taste!\n");

  process.stdin.end();
});
process.stdin.resume();
