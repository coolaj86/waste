'use strict';

module.exports.create = function (app, config, Auth) {
  var apiPrefix = config.apiPrefix
    ;

  function OauthClients() {
  }
  OauthClients.restful = {};

  OauthClients.restful.create = function (req, res) {
    console.log(req.body);
    res.send('test successful');
  };

  return {
    route: function (rest) {
      rest.post(apiPrefix + '/me/clients', OauthClients.restful.create);
    }
  };
};
