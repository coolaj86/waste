'use strict';

module.exports.create = function (app, config, Db) {
  var addresses = module.exports.address =  {}
    ;

  addresses.add = function (req, res) {
    var address = new Db.Addresses()
      ;

    address.save(req.body).then(function (address) {
      req.me.related('addresses').attach(address).then(function () {
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
    req.me.related('addresses').some(function (_address) {
      if (_address.get('row_id') === addressId) {
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

    req.me.related('addresses').detach([addressId]).then(function (addresses) {
      res.send({ response: (addresses||{}).toJSON() });
    }, function (err) {
      res.send(err);
    });
  };

  function route(rest) {
    rest.post('/v1/me/addresses', addresses.add);
    rest.post('/v1/me/addresses/:addressId', addresses.update);
    rest.delete('/v1/me/addresses/:addressId', addresses.remove);
  }

  return  {
    route: route
  };
};
