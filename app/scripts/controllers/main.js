'use strict';

angular.module('yololiumApp')
  .controller(
    'MainCtrl'
  , [ '$scope'
    , '$state'
    , '$stateParams'
    , '$http'
    , '$sce'
    , 'mySession'
    , 'StApi'
    , 'stConfig'
    , function (
        $scope
      , $state
      , $stateParams
      , $http
      , $sce
      , mySession
      , StApi
      , stConfig
    ) {
    if ($stateParams.next) {
      $state.go($stateParams.next, $stateParams.nextParams);
    }

    var M = this
      ;

    M.pic = StApi.business.pic;
    M.tagline = StApi.business.tagline;
    M.video = $sce.trustAsResourceUrl(StApi.business.video);
    M.tpl = stConfig.business;

    if (StApi.redirectGuestsToSplash) {
      if (!mySession || 'guest' === mySession.account.role) {
        console.log('redirect to splash');
        $state.go('splash');
        return;
      }
    }

    //M.message = "This is bound scope, accessed as 'M.message' in templates and 'message' will not leak between scopes";
    //$scope.message = "This is unbound scope, accessed as 'message' in this and child scopes";

    // StSession.subscribe(redirect, $scope);

    M.submitted = false;
    M.contactForm = {};
    M.contact = function () {
      M.pending = true;
      $http.post(StApi.apiPrefix + '/public/contact-form', M.contactForm).then(function () {
        M.pending = false;
        M.submitted = true;
      }, function () {
        window.alert('There was an error sending your message.');
      });
    };

    $scope.myInterval = 3000;
    var slides = $scope.slides = [];
    $scope.addSlide = function(img) {
      // var newWidth = 600 + slides.length;
      slides.push({
        image: 'http://images.coolaj86.com/api/resize/width/350?url=' + img,
        text: ['Social', 'Classy', 'Fun'][slides.length % 3]
      });
    };

    StApi.business.slides.forEach(function (img) {
      $scope.addSlide(img);
    });
  }]);
