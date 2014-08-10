'use strict';

module.exports.create = function (app, config, Db) {
  var addresses = module.exports.address =  {}
    ;

  addresses.add = function (req, res) {
    var address = new Db.Addresses()
      ;

    address.save(req.body).then(function (address) {
      req.user.account.related('addresses').attach(address).then(function () {
        res.send({ response: address.toJSON() });
      });
    }, function (err) {
      res.send(err);
    });
  };

  addresses.update = function (req, res) {
    var address
      , addressId = req.params.addressId
      , updated = req.body
      ;

    //address = new Db.Addresses(req.body.addressId)
    //address.save(req.body, { patch: true }).then(function (address)
    req.user.account.related('addresses').some(function (_address) {
      if (_address.get('id') === addressId) {
        address = _address;
        return true;
      }
    });

    if (!address) {
      res.send({ error: { message: "address does not exist" } });
      return;
    }

    /*
    Object.keys(updated).forEach(function (key) {
      address.set(key, updated[key]);
    });
    */

    address.save(updated, { patch: true }).then(function (address) {
      res.send({ response: address.toJSON() });
    }, function (err) {
      res.send(err);
    });
  };

  addresses.remove = function (req, res) {
    var addressId = req.params.addressId
      ;

    req.user.account.related('addresses').detach([addressId]).then(function (addresses) {
      res.send({ response: (addresses||{}).toJSON() });
    }, function (err) {
      res.send(err);
    });
  };

  function route(rest) {
    rest.post(config.apiPrefix + '/me/addresses', addresses.add);
    rest.post(config.apiPrefix + '/me/addresses/:addressId', addresses.update);
    rest.delete(config.apiPrefix + '/me/addresses/:addressId', addresses.remove);
  }

  return  {
    route: route
  };
};
