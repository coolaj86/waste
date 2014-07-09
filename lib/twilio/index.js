  /*
   * PUBLIC API - SHOULD REQUIRE AUTHENTICATION
   *
   * WARNING these resources should require authorization
   */

  // POST /api/twilio/voice/dialout
  // First use case: the rep is the initiator and caller
  // Second use case: the customer is the initiator, but requesting a call from a rep
  voice.dialout = function (req, res) {
    console.log('dialout (call rep, then call customer)');
    var caller = config.forwardTo // the rep will call the customer // req.body.caller
      , callee = req.body.callee
      , search = '?callee=' + encodeURIComponent(callee)
      ;

    //host = req.headers.host;
    twilio.calls.post(
      { to: caller
      , from: config.number
      // this is already recorded on the outbound side
      //, record: true
      , url: 'http://' + config.host + privMount + '/voice/screen' + search
      }
    , function (err, result) {
        // TODO link call ids and respond back to the browser when the rep has answered or has declined
        console.log('dialout', result.status, result.message, result.code);
        res.send({ "success": true });
      }
    );
  };
