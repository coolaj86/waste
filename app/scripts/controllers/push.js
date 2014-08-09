'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:PushCtrl
 * @description
 * # PushCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('PushCtrl', ['$http', function ($http) {
    var P = this
      ;
    // TODO use var P = this
    // (didn't do that because I copied much of this code from an example)
    // NOTE: A lot of the init stuff is dead code from the example

    P.msg = P.msg || {};
    P.msg.date = new Date();
    P.msg.time = P.msg.date;
    P.msg.timetype = 'soon';

    // This is where the magic happens
    P.scheduleMessage = function () {
      var rules = {}
        , day = 24 * 60 * 60 * 1000
        , msg = P.msg
        , targetStartTime
        , targetZoneTime
        ;

      console.log(P.msg);
      function pad(str, len) {
        str = str.toString();

        while (str.length < len) {
          str = '0' + str;
        }

        return str;
      }

      function mergeLocaleZoneless(date, time) {
        var localeIsoString
          ;

        localeIsoString = ''
          + date.getFullYear() // yyyy
          + '-'
          + pad(date.getMonth() + 1, 2) // 0-11 -> 01-12
          + '-'
          + pad(date.getDate(), 2) // 1-31 -> 01-31
          + 'T'
          + pad(time.getHours(), 2) // 0-23 -> 01-23
          + ':'
          + pad(time.getMinutes(), 2) // 0-59 -> 00-59
          + ':'
          + pad(time.getSeconds(), 2) // 0-59 -> 00-59
          + '.'
          + pad(time.getMilliseconds(), 3) // 0-999 -> 000->999
          + time.toString().replace(/.*GMT([\-+]\d{4}).*/g, '$1')
          ;

        return localeIsoString;
      }

      targetStartTime = mergeLocaleZoneless(msg.date, msg.time);

      if ('now' === msg.timetype) {
        targetZoneTime = null;
        rules = {
          dtstart: {
            utc: new Date(
              new Date(mergeLocaleZoneless(msg.date, msg.time)).getTime() + (60 * 1000)
            ).toISOString()
          , locale: 'GMT-0000 (UTC)'
          }
        , rrule: null
        };
      }

      if ('soon' === msg.timetype) {
        targetZoneTime = '*'; // any business hours
        rules = {
          dtstart: {
            utc: new Date(
              new Date(mergeLocaleZoneless(msg.date, msg.time)).valueOf() + (60 * 1000)
            ).toISOString()
          , locale: 'GMT-0000 (UTC)'
          }
        , rrule: {
            until: new Date(
              new Date(mergeLocaleZoneless(msg.date, msg.time)).valueOf() + (day / 2) + (60 * 1000)
            ).toISOString()
          , byhour: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
          , bysecond: [59]
          , count: 12
          }
        };
      }

      if ('custom' === msg.timetype) {
        console.log(P.datetest);
        console.log(P.timetest);
        return;
        if ('zoneless' === msg.relativeZone) {
          targetZoneTime = targetStartTime.replace(/-\d{4}$/, ''); // the GMT offset
          // at many times
          rules = {
            dtstart: {
              utc: new Date(
                new Date(mergeLocaleZoneless(msg.date, msg.time)).valueOf() + (60 * 1000)
              ).toISOString()
            , locale: 'GMT-0000 (UTC)'
            }
          , rrule: {
              until: new Date(
                new Date(mergeLocaleZoneless(msg.date, msg.time)).valueOf() + (day) + (60 * 1000)
              ).toISOString()
            , byhour: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
            , bysecond: [59]
            , count: 24
            }
          };
        } else {
          // at a specific time
          targetZoneTime = null;
          rules = {
            dtstart: {
              utc: new Date(
                new Date(mergeLocaleZoneless(msg.date, msg.time)).valueOf() + (60 * 1000)
              ).toISOString()
            , locale: 'GMT-0000 (UTC)'
            }
          , rrule: null
          };
        }
      }

      rules.data = { body: P.msg.body };
      console.log(rules);
      $http.post('/api/alarms', rules, function () {
        // post this to the backend,
        // which will then post it to the alarms service
        // (which is defined in config.js.alarms.url)
      });
    };
  }]);
