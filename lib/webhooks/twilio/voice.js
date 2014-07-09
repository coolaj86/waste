"use strict";

module.exports.create = function (opts) {
  // Send a text message right away with the number

  var voice = {}
    , config
    , twilio
    , privMount
    ;

  privMount = opts.webhookPrefix;
  config = opts;
  twilio = opts.client;


  function forwardRecordedCallViaEmail(caller, mp3, body) {
    var subject
      , msg
      ;

    subject = "Recorded Call with " + caller ;
    msg = ""
      + "\n" + caller + "\n\n"
      + mp3
      + "\n\n\n\n"
      + body
      ;

    opts.api.mailIn(caller, subject, msg);
  }

  /*
  function forwardVoicemailViaSms(caller, mp3) {
    // Use this convenient shorthand to send an SMS:
    twilio.sendSms(
      { to: config.forwardIncomingCallsTo
      , from: config.number
              //             15 +   12   +  1  + 122 = 150
      , body: "Voicemail from " + caller + " " + mp3
      }
    , function(error, message) {
        if (!error) {
          console.log('Success! The SID for this SMS message is:');
          console.log(message.sid);

          console.log('Message sent on:');
          console.log(message.dateCreated);
        }
        else {
          console.log('Oops! There was an error.');
        }
      }
    );
  }
  */


  /*
   * PRIVATE API - these resources talk to Twilio
   */
  voice.connectrep = function createCallRepTwiMl(req, res) {
    console.log('call is not complete');
    // Tell the Rep to press any key to accept
    // 7200 == 2 hours
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      ;

    response = ""
      + '<Response>'
      + '<Dial timeLimit="7200" timeout="12" callerId="' + config.number 
        + '" record="true" action="' + privMount + '/voice?tried=true">'
      + '<Number url="' + privMount + '/voice/screen">'
      + config.forwardIncomingCallsTo
      + '</Number>'
      + '</Dial>'
      + '</Response>'
      ;

    console.log('DEBUG response:', response);
    // TODO send email in case the caller hangs up without leaving voicemail

    res.xend(response);
  };

  voice.status = function (req, res) {
    console.log('[STATUS]');

    // if our system went down in-between call
    if (!req.call) {
      opts.api.mailIn(req.body.Caller, '[voice] Dropped Call from ' + req.body.Caller, JSON.stringify(req.body, null, '  '));
    }

    // see if the voicemail callback picks this up
    if (!req.call.hasVoicemail) {
      setTimeout(function () {
        if (!req.call.hasVoicemail) {
          opts.api.mailIn(req.body.Caller, '[voice] Dial & Hangup from ' + req.body.Caller, JSON.stringify(req.body, null, '  '));
        }
      }, 10 * 1000);
    }

    res.xend('<Response></Response>');
  };

  voice.voicemail = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      ;

    console.log('redirect to voicemail');
    // redirect to voicemail
    response += ""
      + "<Response>"
      + '<Redirect method="POST">' + opts.webhookPrefix + "/voicemail" + "</Redirect>"
      + "</Response>"
      ;

    res.xend(response);
  };

  // POST ' + privMount + '/voice?tried=true
  // ?caller=somenumber
  voice.create = function (req, res) {
    if (req.query.tried && 'completed' !== req.body.DialCallStatus) {
      voice.voicemail(req, res);
    } else if (!req.body || 'completed' !== req.body.DialCallStatus) {
      voice.connectrep(req, res);
    } else {
      voice.recordings(req, res);
      return;
    }
  };

  voice.recordings = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      , caller
      ;


    console.log('completed');
    // Send recorded conversanion
    caller = req.query.customerNumber || req.body.Caller;
    forwardRecordedCallViaEmail(caller, req.body.RecordingUrl, JSON.stringify(req.body, null, '  '));
    response += ""
      + '<Response><Hangup/></Response>'
      ;

    res.xend(response);
  };

  /*
  // From Customer to Rep
  voice.dialin = function (req, res) {
    // first send email/text to rep, then call
    // IfMachine hangup
    console.log('dialin (calls the customer first and then the rep)');
  };
  */

  voice.miss = function (req, res) {
    // for dialout, this doesn't need to do anything
    // send email to rep
    // send text to customer
    res.xend('<Response></Response>');
    //redirect = '<Redirect>' + privMount + '/voice/missed?customerNumber=' + req.query.callee + '</Redirect>';
  };

  // POST /twilio/voice/screen
  // Ensure that this is a person and not voicemail
  // https://www.twilio.com/docs/howto/callscreening
  voice.screen = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      , callback = req.query.callback
      , search = ''
      , redirect = ''
      , keyNum = '2'
      ;

    if (callback) {
      callback = '<Redirect method="POST">' + callback + '</Redirect>';
    }

    // This block is to handle the Dialin vs Dialout issue
    // If the customer is dialing in from web click-to-call it means that they get called first
    // If the customer uses a dialout click-to-call, the rep gets called first
    //
    // TODO req.body includes Called / To and Caller / From,
    // CallSid, and Direction (inbound/outbound)
    // With a little bit of session logic on CallSid
    // we could reasonably cut back on the query parameter passing
    if (req.query.callee) {
      search = '?callee=' + encodeURIComponent(req.query.callee);
      if ('customer' === req.query.initiator) {
        redirect = '<Redirect>' + privMount + '/voice/miss?customerNumber=' + req.query.callee + '</Redirect>';
      }
    } else if (req.query.caller) {
      search = '?caller=' + encodeURIComponent(req.query.caller);
      if ('customer' === req.query.initiator) {
        redirect = '<Redirect>' + privMount + '/voice/miss?customerNumber=' + req.query.caller + '</Redirect>';
      }
    }

    // Tell the Rep to press any key to accept
    // The node api can't do this
    //
    response += ""
      + '<Response><Gather action="' + privMount + '/voice/connect'
        + search + '" finishOnKey="' + keyNum + '" numDigits="1">'
      + '<Say>Press the number ' + keyNum +  ' to accept this call</Say>'
      + '</Gather>'
      // TODO instead of hanging up, redirect to voicemail?
      // otherwise it's left to the fallback url to pickup the voicemail
      //+ '<Hangup/>'
      + (callback || redirect || '')
      + '</Response>'
      ;

    res.xend(response);
  };

  // POST ' + privMount + '/voice/connect
  voice.connect = function (req, res) {
    var response
      , dial = ''
      ;

    if (req.query.callee) {
      dial = '<Dial record="true" callerId="' + config.number + '"'
        + ' action="' + privMount + '/voice?customerNumber=' + encodeURIComponent(req.query.callee)
        + '">'
        + req.query.callee + '</Dial>'
        ;
    } else if (req.query.caller) {
      dial = '<Dial record="true" callerId="' + config.number + '"'
        + ' action="' + privMount + '/voice' // ?customerNumber=' req.body.Caller??
        + '">'
        + req.query.callee + '</Dial>'
        ;
    }
    // Tell the rep that they're being connected
    response = ""
      + '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<Response>'
      + '<Say>Connecting</Say>'
      + dial
      + '</Response>'
      ;

    res.xend(response);
  };

  return voice;
};
