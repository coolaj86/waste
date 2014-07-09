'use strict';

var mailer = require('./comms/shared').mailer
  , validator = require('validator')
  ;

module.exports.create = function (app, opts) {
  function route(rest) {
    rest.post('/public/contact-form', function (req, res) {
      var body = req.body
        , looksGood
        ;

      // TODO add to contacts
      // TODO captcha
      // TODO ip rate limiting
      looksGood = ['name', 'phone', 'email', 'message'].every(function (key) {
        if ('string' !== typeof body[key]) {
          res.statusCode = 422;
          res.send({ error: { message: "must include name, phone, email, and message" } });
          return false;
        }

        return true;
      });

      if (!validator.isEmail(body.email)) {
          res.statusCode = 406;
        res.send({ error: { message: "email must be an email address" } });
      }

      if (!looksGood) {
        return;
      }

      mailer.send(
        { from: opts.mailer.defaults.system
        //, to: event.email
        , to: opts.mailer.defaults.replyTo
        , bcc: opts.mailer.defaults.bcc
        , replyTo: body.name.trim().replace(/[\n\r(\\"]/g, '') + ' <' + body.email + '>'
        , subject: "Conversation with " + body.name.trim().replace(/[\n\r\\"]/g, '')
        , text: body.message + '\n\n'
            + '--\n'
            + body.name + '\n'
            + body.phone + '\n'
            + body.email + '\n'
        }
      ).then(
        function () {
          res.send({ success: true });
        }
      , function (error) {
          res.statusCode = 500;
          res.send({ error: { message: "didn't send message: " + (error.message || error.toString()) } });
        }
      );
    });
  }

  return {
    route: route
  };
};
