'use strict';

angular.module('sortinghatApp')
  .controller('NavCtrl', function ($state) {
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
  });
