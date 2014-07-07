'use strict';

var texter = require('../comms/shared').texter
  //, mailer = require('../comms/shared').mailer
  , formatNumber = require('./format-number').formatNumber
  , Promise = require('es6-promise')
  ;

module.exports.create = function (opts) {
  function forwardViaSms(message) {
    return new Promise(function (resolve, reject) {
      var number
        , error = {}
        ;

      console.log(Object.keys(message));
      console.log('text', message['stripped-text']);
      console.log('From', message.From);
      console.log('from', message.from);
      console.log('To', message.To);
      console.log('recipient', message.recipient);
      console.log('sender', message.sender);

      // TODO how to verify that the sender sent the mail?

      if (message['X-Mailgun-SFlag'] || message['X-Mailgun-SScore']) {
        // don't allow spaminess
        error.message = '[SMS] sender looks like spam';
        console.error(error.message);
        reject(error);
        return;
      }
      if (!(new RegExp('^coolaj86@gmail.com$|' + opts.emaildomain + '$').test(message.sender))) {
        // don't allow spaminess
        error.message = "[SMS] sender '" + message.sender + "' isn't allowed";
        console.error(error.message);
        reject(error);
        return;
      }

      number = formatNumber(message.recipient.replace(/@.*/, ''));
      if (!number) {
        error.message = "[SMS] invalid phone number prefix '" + message.recipient + "'";
        console.error(error.message);
        reject(error);
        return;
      }

      if (message['stripped-text'].trim() !== message['stripped-text'].trim().substr(0, 160)) {
        error.message = "[SMS] message too long: " + message['stripped-text'].length;
        error.code = "MSG_LENGTH";
        console.error(error.message);
        reject(error);
        return;
      }

      return texter.sms(
        { to: number
        , from: opts.twilio.number
        , body: message['stripped-text'].trim()
        }
      );
    });
  }

  return {
    catchall: function (req, res) {
      // TODO check recipient as opts.smsdomain
      if (formatNumber(req.body.recipient.replace(/@.*/, ''))) {
        forwardViaSms(req.body).then(
          function (resp) {
            res.end({ success: true });
            return resp;
          }
        , function (err) {
            if (err) {
              console.error('[TEXTING ERROR]');
              console.error(err);
              res.end({ error: err });
              return;
            }
          }
        );

        return;
      }

      res.end({ error: { message: "not implemented: only sms-forwarding works right now" } });
    }
  };
};
