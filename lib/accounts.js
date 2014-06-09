'use strict';

module.exports.create = function (app/*, config, Auth*/) {
  app.use('/accounts', function (req, res, next) {
    if (!(req.user && req.user.mostRecentLoginId && req.user.login)) {
      res.send({ error: { message: "NO LOGIN" } });
      return;
    }

    next();
  });

  function route(rest) {
    rest.post('/accounts/:accountId', function (req, res) {
      res.send({ error: { message: "NOT IMPLEMENTED" } });
    });

    rest.post('/accounts', function (req, res) {
      res.send({ error: { message: "NOT IMPLEMENTED" } });
    });
  }

  return {
    route: route
  };
};
