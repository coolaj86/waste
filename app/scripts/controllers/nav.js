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

    $scope.login = function () {
      StLogin.show().then(function (data) {
        $scope.session = data;
      }, function () {
        // nada
      });
    };
  });
