'use strict';

module.exports.create = function (app, config, Auth) {

  // /me -> /accounts/:accountId
  function attachAccount(req, res, next) {
    console.log('ensuring req.me');
    if (req.me) {
      next();
      return;
    }

    if ('guest' === req.user.account.role) {
      res.send({ error: { message: "Sign in to your account to register a device" } });
      return;
    }

    req.me = req.me || {};
    req.me.get = req.me.get || function (attr) {
      var xattrs
        ;

      if ('xattrs' !== attr && req.user.account[attr]) {
        return req.user.account[attr];
      }

      if ('xattrs' !== attr) {
        throw new Error("'" + attr + "' not supported");
      }

      xattrs = req.user.account.xattrs = req.user.account.xattrs || {};
      xattrs.devices = xattrs.devices || [];
      xattrs.preferences = xattrs.preferences || {};
      xattrs.preferences.notifications = xattrs.preferences.notifications || [];
      return xattrs;
    };
    req.me.set = function (attr, val) {
      req.user.account[attr] = val;
    };
    req.me.save = function () {
      Auth.Accounts.save(req.user.account);
    };

    next();
  }
  app.use(config.apiPrefix + '/me/devices', attachAccount);

  function route(rest) {
    var Devices = {}
      ;

    Devices.put = function (account, newDevice) {
      var devices = account.get('xattrs').devices
        , updated
        ;

      updated = devices.some(function (d, i) {
        if (d.id === newDevice.id || d.token === newDevice.token) {
          devices[i] = newDevice;
          return true;
        }
      });

      if (!updated) {
        devices.push(newDevice);
      }

      account.set('xattrs', account.get('xattrs'));
      account.save();

      return true;
    };

    Devices.remove = function (account, oldDevice) {
      var devices = account.get('xattrs').devices
        , device
        ;

      devices.some(function (d, i) {
        if (d.id === oldDevice.id || d.token === oldDevice.token) {
          device = devices[i].splice(0, i);
          return true;
        }
      });

      if (device) {
        account.save();
      }

      return device;
    };

    rest.post('/me/devices', function (req, res) {
      var body = req.body
        ;

      if (!body.family || !body.id || !body.token) {
        res.send({ error: { message: "missing os family, device id, and / or device token" } });
        return;
      }

      Devices.put(req.me, body);

      res.send({ success: true });
    });

    rest.post('/me/devices/:token', function (req, res) {
      var body = req.body
        ;

      req.body.token = req.body.token || req.params.token;


      if (!body.family || !body.id || !body.token) {
        res.send({ error: { message: "missing os family, device id, and / or device token" } });
        return;
      }

      Devices.put(req.me, req.body);

      res.send({ success: true });
    });

    rest.delete('/me/devices/:token', function (req, res) {
      var device = Devices.remove(req.me, req.params.token)
        ;

      res.send(device || { error: { message: "device not found" } });
    });
  }

  return {
    route: route
  };
};
