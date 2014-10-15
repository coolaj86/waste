'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:PayInvoiceCtrl
 * @description
 * # PayInvoiceCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('PayInvoiceCtrl', ['$modalInstance', 'StStripe', 'StAlert', 'stConfig', function ($modalInstance, StStripe, StAlert, stConfig) {
    console.log('Pay Invoice');

    var P = this
      ;

    P.title = stConfig.payInvoiceTitle;

    P.purchase = {};

    function initTimepicker() {
      P.purchase.fromTime = new Date();
      P.purchase.fromTime.setHours(19);
      P.purchase.fromTime.setMinutes(0);
      P.purchase.fromTime.setSeconds(0);
      P.purchase.fromTime.setMilliseconds(0);
      console.log(P.purchase.fromTime);
      P.purchase.toTime = new Date();
      P.purchase.toTime.setHours(22);
      P.purchase.toTime.setMinutes(30);
      P.purchase.toTime.setSeconds(0);
      P.purchase.toTime.setMilliseconds(0);
      console.log(P.purchase.toTime);

      P.hstep = 1;
      P.mstep = 30;

      P.ismeridian = true;

      P.updateAmount = function () {
        if (P.purchase.fromTime.valueOf() > P.purchase.toTime.valueOf()) {
          // might not work during daylight savings switch on June 21st... but who hires me until 2am?
          P.purchase.toTime = new Date(P.purchase.toTime.valueOf() + (24 * 60 * 60 * 1000));
        }
        P.purchase.hours = (P.purchase.toTime.valueOf() - P.purchase.fromTime.valueOf()) / (60 * 60 * 1000);

        console.log('UPDATE AMOUNT');
        console.log(P.purchase);
        P.purchase.amount = (5000 * P.purchase.hours);
        if (P.purchase.amount < 15000) {
          P.purchase.amount = 15000;
        }
        P.purchase.displayAmount = (P.purchase.amount / 100);
        console.log(P.purchase);
      };
      P.updateAmount();
    }
    initTimepicker();

    P.updateDisplayAmount = function () {
      console.log('update display');
      console.log(P.purchase.amount);
      console.log(P.purchase.displayAmount);
      P.purchase.amount = Math.round(parseInt((String(P.purchase.displayAmount || "")).replace(/$/, '') * 100));
      console.log(P.purchase.amount);
      console.log('update display');
    };
    P.confirm = function () {
      $modalInstance.close();

      var product
        ;

      product = {
        title: "Event Deposit"
      , id: "deposit"
      , short: P.purchase.hours + " hours service"
      , desc: "Transferable, but non-refundable deposit"
      , amount: P.purchase.amount
      //, imgsrc: getImgUrl("http://www.reenigne.org/photos/2004/4/doodads.jpg")
      };

      function happyMessage(thing) {
        console.log('happy', thing);
        StAlert.alert({
          title: "$" + (product.amount / 100) + " Payment made"
        , message: product.title + " has been paid. You should receive an email confirmation from Stripe within 5 to 10 minutes."
        });
      }

      function sadMessage(thing) {
        console.log('sad', thing);

        StAlert.alert({
          title: "Payment failed"
        , message: "Something went wrong while processing the payment. However, if you receive an email confirmation, the card was successfully charged and we'll have to manually update your payment history. Otherwise your card was not yet charged."
        });
      }

      // TODO pre-confirmed option
      StStripe.purchase(product).then(
        function (thing) {
          // TODO move this error check up the chain
          if (thing.error) {
            sadMessage(thing);
            return;
          }

          happyMessage(thing);
        }
      , function (thing) {
          // escape key press
          // escape button click
          if (/escape/i.test(thing.toString()) || (thing && (thing.ignore || thing.cancelled))) {
            console.log('cancelled transaction', thing);
            return;
          }

          sadMessage(thing);
        }
      );
    };
    P.cancel = function () {
      $modalInstance.dismiss({ ignore: true });
    };

  }]);
