'use strict';

angular.module('sortinghatApp')
  .controller('NavCtrl', function ($state, StLogin) {
    var $scope = this
      ;

    $scope.tabs = [
      { active: $state.includes('root')
      , title: 'Home'
      , href: $state.href('root')
      }
    , { active: $state.includes('about')
      , title: 'About'
      , href: $state.href('about')
      }
    ];

    /*
    .then(function (data) {
        console.log('login closed');
        console.log('data', data);

        // TODO uuid
        if (data.email && !data.error) {
          while ($scope.alerts.pop()) {}
          d.resolve(data);
          return;
        }

        $scope.alerts[0] = {
          type: "error"
        , msg: "You must login and provide an email address to submit your idea. This is how we prevent spam posts."
        };
      }, function () {
        console.log('login dismissed');

        d.reject();
        $scope.alerts[0] = {
          msg: "You must login to submit your idea. This is how we prevent spam posts."
        };
      });
    */


    $scope.login = function () {
      StLogin.show().then(function (data) {
        $scope.session = data;
      }, function () {
        // nada
      });
    };
  });
