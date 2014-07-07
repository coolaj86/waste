'use strict';

var Twilio = require('twilio')
  , scmp = require('scmp')
  , crypto = require('crypto')
  , mailgunTokens = {}
  , mailgunExpirey = 15 * 60 * 1000
  ;

function validateMailgun(apiKey, timestamp, token, signature) {
  var adjustedTimestamp = parseInt(timestamp, 10) * 1000
    , fresh = (Math.abs(Date.now() - adjustedTimestamp) < mailgunExpirey)
    ;


  if (!fresh) {
    console.error('[mailgun] Stale Timestamp: this may be an attack');
    console.error('[mailgun] However, this is most likely your fault\n');
    console.error('[mailgun] run `ntpdate ntp.ubuntu.com` and check your system clock\n');
    console.error('[mailgun] System Time: ' + new Date().toString());
    console.error('[mailgun] Mailgun Time: ' + new Date(adjustedTimestamp).toString(), timestamp);
    console.error('[mailgun] Delta: ' + (Date.now() - adjustedTimestamp));
    return false;
  }

  if (mailgunTokens[token]) {
    console.error('[mailgun] replay attack');
    return false;
  }
  mailgunTokens[token] = true;

  setTimeout(function () {
    delete mailgunTokens[token];
  }, mailgunExpirey + (5 * 1000));


  return scmp(
    signature
  , crypto.createHmac('sha256', apiKey)
    .update(new Buffer(timestamp + token, 'utf-8'))
    .digest('hex')
  );
}

module.exports.create = function (app, config) {
  app.use(config.webhookPrefix + '/twilio', function (req, res, next) {
    // TODO use `(req._encryptedSomethingOrOther ? https : http) + req.host` instead of opts.href
    var fullUrl = config.href + (req.originalUrl || req.url)
      , signature = req.headers['x-twilio-signature']
      ;

    // TODO create passport module for twilio auth-ing itself (with a user token too)?

    if (!Twilio.validateRequest(config.twilio.auth, signature, fullUrl, req.body)) {
      console.error('Request came, but not from Twilio');
      res.xend('<Error>Invalid signature. Are you even Twilio?</Error>');
      return;
    }
    
    next();
  });

  app.use(config.webhookPrefix + '/mailgun', function (req, res, next) {
    if (!validateMailgun(config.mailer.opts.apiKey, req.body.timestamp, req.body.token, req.body.signature)) {
      console.error('Request came, but not from Mailgun');
      res.send({ error: { message: 'Invalid signature. Are you even Mailgun?' } });
      return;
    }

    next();
  });

  function route(rest) {
    var forwardSms
      ;
    forwardSms = require('./text').create({
      mailer: config.mailer
    , smsdomain: config.webhooks.text.smsdomain
    , host: config.host
    , href: config.href
    , twilio: config.twilio
    }).forward;

    rest.post(config.webhookPrefix + '/twilio/sms', forwardSms);
    rest.post(config.webhookPrefix + '/twilio/text', forwardSms);
    rest.post(config.webhookPrefix + '/twilio/voice', require('./voice').create(
      { mailer: config.mailer
      , host: config.host
      , href: config.href
      , twilio: config.twilio
      , speakablePhone: config.webhooks.voice.speakablePhone
      , speakableBusiness: config.webhooks.voice.speakableBusiness
      }).autoreply
    );
    rest.post(config.webhookPrefix + '/mailgun/catchall', require('./email').create(
      { mailer: config.mailer
      , host: config.host
      , href: config.href
      , twilio: config.twilio
      , smsdomain: config.webhooks.text.smsdomain
      , emaildomain: config.mailer.opts.emaildomain
      }).catchall
    );
  }

  return { route: route };
};
