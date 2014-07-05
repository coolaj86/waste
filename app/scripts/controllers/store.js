'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:StoreCtrl
 * @description
 * # StoreCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('StoreCtrl', function ($scope, $http, StStripe, StApi) {
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
        function () {
          console.log('Bought the ', product.title);
        }
      , function () {
          console.log('Missed out on the opportunity of a lifetime ', product.title);
        }
      );
    };
  });
