'use strict';

var Twilio = require('twilio')
  , scmp = require('scmp')
  , crypto = require('crypto')
  ;

module.exports.create = function (app, config) {
  app.use(config.webhookPrefix + '/twilio', function (req, res, next) {
    // TODO create passport module for twilio auth-ing itself?
    var isTwilio
      ;

    isTwilio = Twilio.validateRequest(
      config.twilio.auth
    , req.headers['x-twilio-signature']
      // TODO use `(req._encryptedSomethingOrOther ? https : http) + req.host` instead of opts.host
    , config.host + req.originalUrl
    , req.body
    );

    if (!isTwilio) {
      console.error('Request came, but not from Twilio');
      res.xend('<Error>Invalid signature. Are you even Twilio?</Error>');
      return;
    }
    
    next();
  });

  app.use(config.webhookPrefix + '/mailgun', function (req, res, next) {
    function validateMailgun(apiKey, token, timestamp, signature) {
      return scmp(
        signature
      , crypto.createHmac('sha1', apiKey)
          .update(new Buffer(timestamp + token, 'utf-8'))
          .digest('hex')
      );
    }

    if (!validateMailgun(config.mailer.opts.apiKey, req.body.token, req.body.timestamp, req.body.signature)) {
      console.error('Request came, but not from Mailgun');
      res.send({ error: { message: 'Invalid signature. Are you even Mailgun?' } });
      return;
    }

    next();
  });

  function route(rest) {
    rest.post(config.webhookPrefix + '/twilio/sms', require('./text').create(
      { mailer: config.mailer
      , smsdomain: config.webhooks.text.smsdomain
      , host: config.host
      , twilio: config.twilio
      }).forward
    );
    rest.post(config.webhookPrefix + '/twilio/voice', require('./voice').create(
      { mailer: config.mailer
      , host: config.host
      , twilio: config.twilio
      , speakablePhone: config.webhooks.voice.speakablePhone
      , speakableBusiness: config.webhooks.voice.speakableBusiness
      }).autoreply
    );
    rest.post(config.webhookPrefix + '/mailgun/catchall', require('./email').create(
      { mailer: config.mailer
      , host: config.host
      , twilio: config.twilio
      , smsdomain: config.webhooks.text.smsdomain
      }).storeOrForward
    );
  }

  return { route: route };
};
