'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:BookCtrl
 * @description
 * # BookCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('BookCtrl', function ($scope, $modalInstance, StStripe, StAlert) {
    console.log('Book Gig / Pay Deposit');

    var B = this
      ;

    B.title = "Book your Event with us";

    B.purchase = {};

    function initTimepicker() {
      B.purchase.fromTime = new Date();
      B.purchase.fromTime.setHours(19);
      B.purchase.fromTime.setMinutes(0);
      B.purchase.fromTime.setSeconds(0);
      B.purchase.fromTime.setMilliseconds(0);
      console.log(B.purchase.fromTime);
      B.purchase.toTime = new Date();
      B.purchase.toTime.setHours(22);
      B.purchase.toTime.setMinutes(30);
      B.purchase.toTime.setSeconds(0);
      B.purchase.toTime.setMilliseconds(0);
      console.log(B.purchase.toTime);

      B.hstep = 1;
      B.mstep = 30;

      B.ismeridian = true;

      B.updateAmount = function () {
        if (B.purchase.fromTime.valueOf() > B.purchase.toTime.valueOf()) {
          // might not work during daylight savings switch on June 21st... but who hires me until 2am?
          B.purchase.toTime = new Date(B.purchase.toTime.valueOf() + (24 * 60 * 60 * 1000));
        }
        B.purchase.hours = (B.purchase.toTime.valueOf() - B.purchase.fromTime.valueOf()) / (60 * 60 * 1000);

        console.log('UPDATE AMOUNT');
        console.log(B.purchase);
        B.purchase.amount = (5000 * B.purchase.hours);
        if (B.purchase.amount < 15000) {
          B.purchase.amount = 15000;
        }
        B.purchase.displayAmount = (B.purchase.amount / 100);
        console.log(B.purchase);
      };
      B.updateAmount();
    }
    initTimepicker();

    B.confirm = function () {
      $modalInstance.close();

      var product
        ;

      product = {
        title: "Event Deposit"
      , id: "deposit"
      , short: B.purchase.hours + " hours service"
      , desc: "Transferable, but non-refundable deposit"
      , amount: B.purchase.amount
      //, imgsrc: getImgUrl("http://www.reenigne.org/photos/2004/4/doodads.jpg")
      };

      // TODO pre-confirmed option
      StStripe.purchase(product).then(
        function (thing) {
          console.log('happy', thing);
          StAlert.alert({
            title: "$" + (product.amount/100) + "Payment made"
          , message: product.title + " has been paid. Check your email for confirmation."
          });
        }
      , function (thing) {
          console.log('sad', thing);

          // escape key press
          // escape button click
          if (/escape/i.test(thing.toString()) || (thing && (thing.ignore || thing.cancelled))) {
            return;
          }

          StAlert.alert({
            title: "Payment failed"
          , message: "Something went wrong while processing the payment. However, if you receive an email confirmation, the card was successfully charged and we'll have to manually update your payment history. Otherwise your card was not yet charged."
            + product.title + " at an unbelievable price)"
          });
        }
      );
    };
    B.cancel = function () {
      $modalInstance.dismiss({ ignore: true });
    };

  });
