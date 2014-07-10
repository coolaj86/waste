'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:PayInvoiceCtrl
 * @description
 * # PayInvoiceCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('PayInvoiceCtrl', function ($scope, $modalInstance, StStripe, StAlert) {
    console.log('Pay Invoice');

    var P = this
      ;

    P.title = "Pay Part or All of your Invoice";

    P.purchase = {};
    P.updateAmount = function () {
      console.log('UPDATE AMOUNT');
      console.log(P.purchase);
      P.purchase.amount = (5000 * P.purchase.hours);
      P.purchase.displayAmount = (P.purchase.amount / 100);
      console.log(P.purchase);
    };

    P.confirm = function () {
      $modalInstance.close();

      var product
        ;

      product = {
        title: "Event Deposit"
      , short: P.purchase.hours + " hours service"
      , desc: "Transferable, but non-refundable deposit"
      , amount: P.purchase.amount
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
          , message: "You missed out on the opportunity of a lifetime (to get "
            + product.title + " at an unbelievable price)"
          });
        }
      );
    };
    P.cancel = function () {
      $modalInstance.dismiss({ ignore: true });
    };

  });
