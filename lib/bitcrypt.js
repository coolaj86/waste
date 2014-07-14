'use strict';

// Goal: A mini PCI compliant datastore
// Don't leak data through error messages
// Encrypt data as soon as possible
// Decrypt as late as possible
// Don't store encryption key on the server

function logSql(statement, values) {
  console.log(statement);
  console.log(values);
}

module.exports.create = function (app, config, Db) {
  // The key is only stored in memory
  // never at any time should it be stored on disk
  var crypto = require('crypto')
    , UUID = require('node-uuid')
    , SECRET_KEY
    , ENCODING = 'base64' // 'hex'
    , cipherType = 'aes-256-cbc' // 'des-ede3-cbc'
    , bitAccessToken = config.bitcrypt.accessToken
    , bitKeySecret = config.bitcrypt.keySecret
    ;

  // TODO text admin on startup (and have the phone automatically email over tls back ??)
  app.use('/bitcrypt', function (req, res, next) {
    console.log('[app.use] bitcrypt');

    if (bitAccessToken !== req.headers.authorization.replace(/^\s*Bearer\s+/i, '')) {
      res.statusCode = 400;
      res.send({ error: { message: "Unauthorized" } });
      return;
    }

    if (!SECRET_KEY && !(req.body.secret && req.body.key)) {
      res.statusCode = 400;
      res.send({ error: { message: "The server was shut down, but has not been initialized" } });
      return;
    }

    next();
  });

  function route(rest) {
    function reKey(req, res) {
      if (bitKeySecret !== req.body.secret) {
        res.statusCode = 400;
        res.send({ error: { message: "Unauthorized" } });
        return;
      }

      if (!req.body.key) {
        res.statusCode = 400;
        res.send({ error: { message: "You didn't specify a key" } });
        return;
      }

      if (SECRET_KEY && SECRET_KEY !== req.body.key) {
        res.statusCode = 400;
        res.send({ error: { message: "You can't change the key without first deleting the database" } });
        return;
      }

      SECRET_KEY = req.body.key;
      res.send({ success: true });
    }

    function getBit(req, res) {
      console.log('[getBit]');

      Db.Data.forge({ uuid: req.params.id }).fetch().then(function (data) {
        console.log('getBit');

        if (!data) {
          console.log('getBit[0]');
          res.statusCode = 404;
          res.send({ error: { message: "datum not found" } });
          return;
        }

        var decipher = crypto.createDecipher(cipherType, SECRET_KEY)
          , decrypted
          ;

        try {
          console.log(data);
          decrypted  = JSON.parse(decipher.update(data.get('value'), ENCODING, 'utf8') + decipher.final('utf8'));
        } catch(e) {
          console.error(e);
          console.log('getBit[1]');
          res.statusCode = 500;
          res.send({ error: { message: "server not initialized or data corrupt" } });
          return;
        }

        console.log('getBit[2]');
        res.send({ success: true, value: decrypted });
      }, function (err) {
        console.error(err);
        res.statusCode = 500;
        res.send({ error: { message: "transaction error" } });
        return;
      });
    }

    function newBit(req, res) {
      var cipher = crypto.createCipher(cipherType, SECRET_KEY)
        , crypted
        , data = req.body
        , id
        ;

      if (!data || !data.value) {
        res.statusCode = 404;
        res.send({ error: { message: "datum not found" } });
        return;
      }
       
      try {
        crypted = cipher.update(JSON.stringify(req.body.value), 'utf8', ENCODING) + cipher.final(ENCODING);
      } catch(e) {
        res.statusCode = 500;
        res.send({ error: { message: "server not initialized or data not cryptable" } });
        return;
      }

      id = UUID.v4();
      console.log(id);
      console.log(crypted);
      Db.Data.forge({ uuid: id })
        .on('query', logSql)
        .save({ uuid: id, value: crypted }, { method: 'insert' })
        .then(function (data) {
          if (!data) {
            res.statusCode = 500;
            res.send({ error: { message: "server not initialized or db corrupt" } });
            return;
          }

          res.send({ success: true, id: id });
        }, function (err) {
          console.error(err);
          res.statusCode = 500;
          res.send({ error: { message: "server not initialized or db connection dropped" } });
          return;
        });
    }

    function delBit(req, res) {
      var id = req.params.id
        ;

      Db.Data.forge({ uuid: id }).destroy().then(function (/*data*/) {
        // TODO send back data
        res.send({ success: true });
      }, function (/*err*/) {
        res.statusCode = 500;
        res.send({ error: { message: "server not initialized or db parse error" } });
        return;
      });
    }

    rest.post('/bitcrypt/key', reKey);
    rest.post('/bitcrypt', newBit);
    rest.get('/bitcrypt/:id', getBit);
    rest.delete('/bitcrypt/:id', delBit);
  }

  return {
    route: route
  };
};
