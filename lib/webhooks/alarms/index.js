'use strict';

module.exports.create = function (app, config) {


  return: {
    route: function (rest) {
      rest.post(config.webhookPrefix + '/alarms', function (req, res) {
        console.log(req.body);

        res.json({});
      });
    }
  };
};
