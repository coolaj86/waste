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
    B.updateAmount = function () {
      console.log('UPDATE AMOUNT');
      console.log(B.purchase);
      B.purchase.amount = (5000 * B.purchase.hours);
      B.purchase.displayAmount = (B.purchase.amount / 100);
      console.log(B.purchase);
    };

    B.confirm = function () {
      $modalInstance.close();

      var product
        ;

      product = {
        title: "Event Deposit"
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
          , message: "You missed out on the opportunity of a lifetime (to get "
            + product.title + " at an unbelievable price)"
          });
        }
      );
    };
    B.cancel = function () {
      $modalInstance.dismiss({ ignore: true });
    };

  });
