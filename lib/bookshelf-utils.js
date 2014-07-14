'use strict';

var _ = require('lodash')
  , utils = module.exports
  ;

_.str = require('underscore.string');

utils.str = _.str;
utils.toSnakeCase = function (attrs) {
  return _.reduce(attrs, function(memo, val, key) {
    memo[_.str.underscored(key)] = val;
    return memo;
  }, {});
};

utils.toCamelCaseArr = function (keys) {
  return _.reduce(keys, function(memo, key, i) {
    memo[i] = _.str.camelize(key);
    return memo;
  }, []);
};

utils.toCamelCase = function (attrs) {
  return _.reduce(attrs, function(memo, val, key) {
    memo[_.str.camelize(key)] = val;
    return memo;
  }, {});
};

utils.inflateXattrs = function(xattrKey, keys/*, emu*/) {
  xattrKey = xattrKey || 'xattrs';
  keys = keys || [];

  return function (attrs) {
    console.log('[inflateXattrs] attrs');
    console.log(attrs);

    attrs = utils.toCamelCase(attrs);

    var xattrs = attrs[xattrKey] || {}
        // escape xattrKey?
      , keys = Object.keys(attrs)
      ;

    if ('string' === typeof xattrs) {
      if (-1 !== ['"','{','[','n','t','f','1','2','3','4','5','6','7','8','9'].indexOf(xattrs[0])) {
        xattrs = JSON.parse(xattrs);
      } else {
        console.warn("WARNING: Don't store strings in a json field");
      }
    }
    delete attrs[xattrKey];

    Object.keys(xattrs).forEach(function (key) {
      if (!attrs.hasOwnProperty(key) && -1 === keys.indexOf(key)) {
        attrs[key] = xattrs[key];
      }
    });

    console.log('[inflateXattrs] return');
    console.log(attrs);
    return attrs;
  };
};

utils.zipXattrs = function(xattrKey, keys, emulate) {
  return function (attrs) {
    console.log('[zipXattrs] attrs');
    console.log(attrs);
    var xattrs = {}
      ;

    Object.keys(attrs).forEach(function (key) {
      if (-1 === keys.indexOf(key)) {
        xattrs[key] = attrs[key];
        delete attrs[key];
      }
    });

    // This is VERY important because a fetch
    // should not be string-matching the json blob
    if (Object.keys(xattrs).length) {
      if ('text' === emulate) {
        attrs.xattrs = JSON.stringify(xattrs);
      } else {
        attrs.xattrs = xattrs;
      }
    }

    attrs = utils.toSnakeCase(attrs);
    console.log('[zipXttrs] return');
    return attrs;
  };
};

utils.format = function (emu, zipCol, colsMap, jsonCols) {
  var camelFieldNames = utils.toCamelCaseArr(Object.keys(colsMap))
    ;

  console.log('camelFieldNames');
  console.log(camelFieldNames);
  jsonCols = jsonCols || [];

  return function (attrs) {
    // TODO json cols
    attrs = utils.zipXattrs('xattrs', camelFieldNames, emu)(attrs);

    Object.keys(colsMap).forEach(function (key) {
      if ('datetime' === colsMap[key].type) {
        if (!attrs[key]) {
          return;
        }
        if ('number' === typeof attrs[key]) {
          attrs[key] = new Date(attrs[key]).toISOString();
        }
        if ('object' === typeof attrs[key]) {
          attrs[key] = attrs[key].toISOString();
        }
      }
    });
    jsonCols.forEach(function (col) {
      if (attrs[col] && 'text' === colsMap[col].type) {
        attrs[col] = JSON.stringify(attrs[col]);
      }
    });
    return attrs;
  };
};

utils.parse = function (emu, zipCol, colsMap, jsonCols) {
  jsonCols = jsonCols || [];

  return function (attrs) {
    attrs = utils.inflateXattrs('xattrs', null, emu)(attrs);

    jsonCols.forEach(function (col) {
      if (attrs[col] && 'text' === colsMap[col].type) {
        attrs[col] = JSON.parse(attrs[col]);
      }
    });
    return attrs;
  };
};
