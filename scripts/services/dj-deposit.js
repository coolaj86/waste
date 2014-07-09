'use strict';

/**
 * @ngdoc service
 * @name yololiumApp.djDeposit
 * @description
 * # djDeposit
 * Service in the yololiumApp.
 */
angular.module('yololiumApp')
  .service('DjDeposit', function DjDeposit($modal) {
    // AngularJS will instantiate a singleton by calling "new" on this function

    this.show = function (opts) {
      opts = opts || {};

      var keyboard = opts.keyboard
        ;
        
      if ('undefined' === typeof keyboard) {
        keyboard = true;
      }

      return $modal.open({
        templateUrl: '/views/book.html'
      , controller: 'BookCtrl as B'
      , backdrop: 'static'
      , keyboard: keyboard
      , resolve: {
          // so that we could add an explanation or something
          myOptions: function () {
            return opts;
          }
        }
      })
        .result
        // Handle the 'reject' here with a noop so that
        // dissmiss does not trigger it
        .catch(function () {})
        ;
    };
  });
