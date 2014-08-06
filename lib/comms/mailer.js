'use strict';

var Promise = require('es6-promise').Promise
  , nodemailer = require('nodemailer')
  ;

module.exports.Mailer = {
  create: function (service, serviceOpts) {
    var transport = nodemailer.createTransport(service, serviceOpts)
      ;

    function send(opts) {
      return new Promise(function (resolve, reject) {
        transport.sendMail(opts, function (err, resp) {
          if (err) {
            reject(err);
            return;
          }

          resolve(resp);
        });
      });
    }

    return {
      send: send
    , mail: send
    };
  }
};
