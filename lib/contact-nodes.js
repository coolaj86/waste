'use strict';

var PromiseA = require('bluebird')
  , secretutils = require('secret-utils')
  //, UUID = require('uuid')
  //, formatNumber = require('./comms/format-number').formatNumber
  //, validate = require('./st-validate').validate
  , formatNumber = require('./comms/format-number').formatNumber
  , validators = {
      phone: function (phone) {
        return formatNumber(phone);
      }
    , email: function (email) {
        return email && /[^@ ]+@[^@ ]+\.[^@ ]+/.test(email);
      }
    , username: function (username) {
        return username && /[\-\.a-z0-9_]+/.test(username);
      }
    }
  , formatters = {
      phone: function (phone) {
        // this also formats
        return validators.phone(phone) || undefined;
      }
    , email: function (email) {
        return validators.email(email) && email.toLowerCase() || undefined;
      }
    , username: function (username) {
        return validators.username(username) && username.toLowerCase() || null;
      }
    }
  ;

module.exports.createController = function (config, DB) {
  function ContactNodes() {
  }

  ContactNodes.formatters = formatters;
  ContactNodes.validators = validators;

  ContactNodes.getType = function (node) {
    return (validators.phone(node) && 'phone')
      || (validators.email(node) && 'email')
      || (validators.username(node) && 'username')
      || null
      ;
  };

  ContactNodes.upsert = function (type, node) {
    var fnode = ContactNodes.formatters.email(node)
          || ContactNodes.formatters.phone(node)
          || ContactNodes.formatters.username(node)
      //, id = fnode && secretutils.md5sum(fnode)
      , id = fnode && secretutils.md5sum(type + ':' + fnode)
      ;

    return DB.ContactNodes.forge({ type: type, node: node }).then(function ($cn) {
      if ($cn) {
        return $cn;
      }

      return DB.ContactNodes.forge().save({ id: id, type: type, node: node });
    });
  };

  return ContactNodes;
};

module.exports.createView = function (config, DB) {
  var ContactNodes = module.exports.createController(config, DB)
    ;

  return ContactNodes;
};

module.exports.create = function (app, config, DB) {
  var ContactNodes
    ;

  ContactNodes = module.exports.createView(config, DB);

  function route() {
  }

  return {
    route: route
  , ContactNodes: ContactNodes
  };
};
