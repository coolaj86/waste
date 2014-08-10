'use strict';

module.exports.create = function (app, config, Db) {
  var UUID = require('node-uuid')
    , request = require('request')
    ;

  function Alarms() {
  }

  Alarms.restful = {};

  Alarms.restful.create = function (req, res) {
    req.body.webhooks = {
      occurence: "http://localhost:4004/webhooks/alarms"
    , stop: "http://localhost:4004/webhooks/alarms"
    };

    request.post(config.alarms.url + '/api/alarms', function (err, resp, body) {
      res.json({}); // mwahahahahahahaha they'll never know!
    }).json(req.body);
  };

  return {
    route: function (rest) {
      rest.post('/alarms', Alarms.restful.create);
    }
  }
};
