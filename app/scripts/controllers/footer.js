'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:FooterCtrl
 * @description
 * # FooterCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('FooterCtrl', function ($scope, stConfig) {
    var scope = this
      ;

    scope.tpl = stConfig.business;
    scope.currentYear = new Date().getFullYear();
  });
