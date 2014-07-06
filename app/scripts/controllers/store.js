'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:StoreCtrl
 * @description
 * # StoreCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('StoreCtrl', function ($scope, $http, StStripe, StAlert, StApi) {
    var S = this
      ;

    S.products = [];
    S.subscriptions = [];
    $http.get(StApi.apiPrefix + '/public/store/products').then(function (resp) {
      S.products = resp.data.filter(function (a) {
        return !a.period;
      });
      S.subscriptions = resp.data.filter(function (a) {
        return a.period;
      });
    });

    S.buy = function (product) {
      StStripe.purchase(product).then(
        function (thing) {
          console.log('happy', thing);
          StAlert.alert({
            title: "Payment made"
          , message: "Bought the" + product.title
          });
        }
      , function (thing) {
          if (thing.ignore) {
            return;
          }

          console.log('sad', thing);
          StAlert.alert({
            title: "Payment failed"
          , message: "You missed out on the opportunity of a lifetime (to get "
            + product.title + " at an unbelievable price)"
          });
        }
      );
    };
  });
