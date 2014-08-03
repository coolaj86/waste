'use strict';

/**
 * @ngdoc service
 * @name yololiumApp.stAlert
 * @description
 * # stAlert
 * Service in the yololiumApp.
 */
angular.module('yololiumApp')
  .service('StAlert', ['$modal', function StAlert($modal) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    
    this.show = function (opts) {
      opts = opts || {};

      var keyboard = opts.keyboard
        ;
        
      if ('undefined' === typeof keyboard) {
        keyboard = true;
      }

      return $modal.open({
        templateUrl: '/views/alert.html'
      , controller: 'AlertCtrl as A'
      , backdrop: 'static'
      , keyboard: keyboard
      , resolve: {
          // so that we could add an explanation or something
          myOptions: function () {
            return opts;
          }
        }
      }).result;
    };

    this.alert = function (opts) {
      // Handle the 'reject' here with a noop so that
      // dissmiss does not trigger it
      return this.show(opts).then(
        function () {}
      , function () {}
      );
    };

    this.confirm = function (opts) {
      opts = opts || {};
      opts.confirm = true;
      return this.show(opts);
    };
  }]);
