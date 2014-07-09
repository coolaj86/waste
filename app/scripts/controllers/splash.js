'use strict';

angular.module('yololiumApp')
  .controller('SplashCtrl', function ($scope, $http, $state, StSession, StApi) {
    var firstTime = true
      , S = this
      ;

    // We don't want to redirect on page load
    // (the splash page is a restful route)
    // we just want to redirect if the user logs in
    function redirect(session) {
      if (firstTime) {
        firstTime = false;
        return;
      }

      if ('guest' !== session.account.role) {
        $state.go('root');
      }
    }

    StSession.subscribe(redirect, $scope);

    S.submitted = false;
    S.contactForm = {};
    S.contact = function () {
      S.pending = true;
      $http.post(StApi.apiPreix + '/guest/contactus', S.contactForm).then(function () {
        S.pending = false;
        S.submitted = true;
      }, function () {
        window.alert("There was an error sending your message.");
      });
    };

    $scope.myInterval = 5000;
    var slides = $scope.slides = [];
    $scope.addSlide = function(img) {
      var newWidth = 600 + slides.length;
      slides.push({
        image: "http://images.coolaj86.com/api/resize/width/350?url=" + img,
        text: ['Social', 'Classy', 'Fun'][slides.length % 3]
      });
    };

    $scope.addSlide('http://aj.the.dj/images/thumbnail-hard-at-work.jpeg');
    $scope.addSlide('http://aj.the.dj/images/best-busta-move.jpg');
    $scope.addSlide('http://aj.the.dj/images/thumb-awes-sauce-01.jpg');
    $scope.addSlide('http://aj.the.dj/images/thumb-awes-sauce-02.jpg');
    $scope.addSlide('http://aj.the.dj/images/thumb-awes-sauce-03.jpg');
    $scope.addSlide('http://aj.the.dj/images/thumb-awes-sauce-04.jpg');
  });
