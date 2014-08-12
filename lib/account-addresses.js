'use strict';

module.exports.create = function (app, config, Db) {
  var addresses = module.exports.address =  {}
    ;

  addresses.add = function (req, res) {
    var newAddress = req.body
      ;

    newAddress.accountUuid = req.user.account.id;
    console.log('newAddress');
    console.log(newAddress);

    Db.Addresses.forge().save(newAddress).then(function (address) {
      res.send(address.toJSON());
    }, function (err) {
      console.error(err);
      res.error(err);
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
      if (_address.id === addressId) {
        address = _address;
        return true;
      }
    });

    if (!address) {
      res.error({ message: "address does not exist" });
      return;
    }

    /*
    Object.keys(updated).forEach(function (key) {
      address.set(key, updated[key]);
    });
    */

    address.save(updated, { patch: true }).then(function (address) {
      res.send(address.toJSON());
    }, function (err) {
      res.error(err);
    });
  };

  addresses.remove = function (req, res) {
    var addressId = req.params.addressId
      ;

    req.user.account.related('addresses').detach([addressId]).then(function (addresses) {
      res.send((addresses && addresses.toJSON() || []));
    }, function (err) {
      res.error(err);
    });
  };

  function route(rest) {
    rest.post('/me/addresses', addresses.add);
    rest.post('/me/addresses/:addressId', addresses.update);
    rest.delete('/me/addresses/:addressId', addresses.remove);
  }

  return  {
    route: route
  };
};
