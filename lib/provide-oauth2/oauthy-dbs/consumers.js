'use strict';

exports.create = function (app, config) {
  var Storage = require('dom-storage')
    //, Promise = require('es6-promise').Promise
    , UUID = require('node-uuid')
    , Join = require('join').Join
    , JsonStorage = require('json-storage').JsonStorage
    , path = require('path')
    , dbpath = path.join(__dirname, '..', 'db', 'apps.json')
    , store = JsonStorage.create(new Storage(dbpath, { strict: false }), false, { stringify: false })
    , mailer = require('../comms/shared').mailer
    , texter = require('../comms/shared').texter
    , formatNumber = require('../comms/format-number').reformatNumber
    //, smsAddress = require('tel-carrier-gateways')
    , required
    , optional
    , testApp
    , consumers = {}
    ;

  // A working API and key
  // TODO allow the guest app to work on any domain
  testApp = {
    appId: "55c7-test-bd03"
  , appSecret: "6b2fc4f5-test-8126-64e0-b9aa0ce9a50d"
  , name: "Test App"
  , description: "This is meant to bring happiness to developers of all ages. Enjoy!"
  , guest: true
  , logo: "https://www.gravatar.com/avatar/9518e7e4c5dcbcbdb8aad49611d62655?s=128&d=identicon&r=PG"
  , url: "https://ldsconnect.org/test"
  , access: "area"
  };

  setTimeout(function () {
    store.set(testApp.appId, testApp);
  }, 1000);
    /*
    if (!params.service) {
      params.service = 'SMTP';
    }

    transport = nodemailer.createTransport(config.service, config.opts);
      */

  consumers.all = function (cb) {
    var results = []
      ;

    store.keys().forEach(function (key) {
      var thing = store.get(key)
        ;
      
      results.push(consumers.sanatize(thing));
    });

    cb(null, results);
  };

  exports.find = function (obj, cb) {
    var results = []
      , keys = Object.keys(obj)
      ;

    store.keys().forEach(function (key) {
      var thing = store.get(key)
        ;
      
      keys.some(function (k) {
        var val = String(thing[k]) || null
          ;

        if (val === String(obj[k])) {
          results.push(thing);
          return true;
        }
      });
    });

    cb(null, results);
  };

  exports.findOne = function (obj, cb) {
    exports.find(obj, function (err, res) {
      cb(err, res && res.length && res[0]);
    });
  };

  exports.get = function (appId, cb, opts) {
    opts = opts || {};
    cb(null, store.get(appId));
  };

  exports.set = function (appId, val, cb) {
    store.set(appId, val);
    if (cb) {
      cb(null);
    }
  };

  consumers.sanatize = function (obj) {
    var newObj = {}
      ;

    Object.keys(obj).forEach(function (k) {
      newObj[k] = obj[k];
    });

    delete newObj.appSecret;
    delete newObj.appId;
    delete newObj.carrier;
    delete newObj.phone;
    delete newObj.email;

    return newObj;
  };


  // TODO break this big long func into pieces
  required = ['name', 'description', 'url', 'access', 'carrier'];
  optional = ['logo', 'repo', 'ysa'];
  //, 'tags';
  // added manually: appId, appSecret, 'email', 'phone'
  consumers.register = function (req, res) {
    console.log('register');

    // TODO req.user.meta -> req.ldsaccount
    if (!req.user || !req.ldsaccount) {
      res.send({ error: 'Not logged in' });
      return;
    }

    var a = req.body
      , member = req.ldsaccount
      , head = member.currentHousehold.headOfHousehold
      , guest = member.guest
      , app = {}
      , mkeys = []
      , bytes = []
      , join = Join.create()
      , j0
      , j1
      ;

    function sendsms(phone, msg, cb) {
      texter.sms(app.phone, msg, function (err, data) {
        if (err) {
          console.error(err);
        }
        cb(err, data);
      });
    }
    function emailtosms(phone, carrier, msg, cb) {
      if (true) {
        // Just use SMS for now
        sendsms(phone, msg, cb);
        return;
      }

      /*
      var email = smsAddress.sms(carrier, phone)
        ;

      if (email) {
        console.log('found email first', email);
        sendmail(email, msgId, function (err, data) {
          if (err) {
            console.error('telephony.mail failed');
            console.error(err);
          }

          j0(err, [app.phone], [], []);
        });
      } else {
        console.log('trying number via gateway', app.phone);
        telephony.sms(app.phone, msgId, function (err, sendable, malformed, nonwireless) {
          console.log('sendable, malformed, nonwireless');
          console.log(sendable, malformed, nonwireless);
          if (err) {
            console.error('telephony.sms failed');
            console.error(err);
            j0(err, sendable, malformed, nonwireless);
            return;
          }

          if (0 === sendable.length && 1 === nonwireless.length) {
            console.log('trying via twilio', app.phone);
            twilio.sms(app.phone, msgId, function (err, data) {
              if (err) {
                console.error(err);
              }
              j0(err, data);
            });
            return;
          }

          j0(err, sendable, malformed, nonwireless);
        });
      }
      */
    }

    function sendmail(email, msg, cb) {
      mailer.mail({
        bcc: app.email
      , subject: '⌂'
      , cc: config.mailer.defaults.from
      , text: msg
      , from: config.mailer.defaults.from
      , replyTo: config.mailer.defaults.replyTo
      }, cb);
    }

    function sendTokens() {
      var msgId = 'App ID: ' + app.appId
        , msgSecret = 'App Secret: ' + app.appSecret
            + "\n\nThere you go!\nRemember: keep it secret. keep it safe.\n\nHere's confirmation of the data you entered:"
            + JSON.stringify(exports.sanatize(app), null, '  ')
            + '\n\n\n' + JSON.stringify(exports.sanatize(app), null, '  ')
        ;

      j0 = join.add();
      emailtosms(app.phone, app.carrier, msgId, j0);

      j1 = join.add();
      sendmail(
        app.email
      , msgSecret
      , function (err, data) {
          if (err) {
            console.error('mailer.send failed');
            console.error(err);
          }
          j1(err, data);
        }
      );

      join.then(function (telArgs, mailArgs) {
        var msg = { meta: consumers.sanatize(app), guest: guest }
          ;

        if (telArgs[0] || mailArgs[0]) {
          msg.error = telArgs[0] || mailArgs[0];
        } else {
          msg.success = true;
        }

        res.send(msg);
      });
    }

    function fillApp() {
      // so that these will show up first
      app.appId = '';
      app.appSecret = '';
      if (guest) {
        app.guest = guest;
        app.access = 'area';
      }
      app.tags = [];

      required.some(function (k) {
        if ('string' !== typeof a[k] || !a[k].trim()) {
          mkeys.push(k);
        } else {
          app[k] = a[k];
        }
      });
      if (mkeys.length) {
        res.send({ error: 'Incomplete!', missingKeys: mkeys });
        return;
      }
      if (!formatNumber(head.phone) || !head.email) {
        res.send({ error: 'Invalid Phone or Email' });
        return;
      }

      if (Array.isArray(a.tags)) {
        a.tags.forEach(function (tag) {
          if ('string' === typeof tag && tag.trim()) {
            app.tags.push(tag);
          }
        });
      }

      optional.forEach(function (k) {
        if ('string' !== typeof a[k] || !a[k]) {
          app[k] = a[k];
        }
      });

      // this gets texted to a phone, so it besta be short
      app.appId = UUID.v4().replace(/^(\w{4})(\w{4})-(\w{4})-.*/, '$1-$2-$3');
      UUID.v4(null, bytes, bytes.length);
      UUID.v4(null, bytes, bytes.length);
      UUID.v4(null, bytes, bytes.length);
      // this is spozda be secure, so it besta be long
      app.appSecret = new Buffer(bytes).toString('base64');
    }

    function fillAppMore() {
      app.developer = member.currentUserId;
      app.phone = head.phone;
      app.email = head.email;
      // superflous, delete
      if (!app.phone || !app.email) {
        console.error('no phone / email');
        console.log(head);
      }

      // TODO implement this one day
      app.access = '*';
      if ('*' === app.access) {
        // ignore
        delete app.unitno;
      } else if ('area' === app.access) {
        app.unitno = member.currentUnits.areaUnitNo;
      } else if ('stake' === app.access) {
        app.unitno = member.currentUnits.stakeUnitNo;
      } else { // if ('ward' === app.access)
        app.unitno = member.currentUnits.wardUnitNo;
      }
    }

    if (guest) {
      app = testApp;
      fillAppMore();
      res.send({ success: true, guest: guest, meta: app });
      return;
    }

    fillApp();
    fillAppMore();
    store.set(app.appId, app);
    sendTokens();
  };

  consumers.apps = function (req, res) {
    consumers.all(function (err, results) {
      res.send(results);
    });
  };

  function route(rest) {
    rest.post(config.apiPrefix + '/register', consumers.register);
    rest.get('/apps', consumers.apps);
  }

  return {
    route: route
  };
};
