'use strict';

module.exports.create = function (app, config, Db) {
  var UUID = require('node-uuid')
    ;

  function Alarms() {
  }

  Alarms.restful = {};

  Alarms.restful.create = function (req, res) {
    console.log(req.body);

    res.json({}); // mwahahahahahahaha they'll never know!
  };

  return {
    route: function (rest) {
      rest.post('/alarms', Alarms.restful.create);
    }
  }
};
