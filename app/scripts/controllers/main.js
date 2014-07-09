'use strict';

angular.module('yololiumApp')
  .controller('MainCtrl', function ($scope, $state, $timeout, data, mySession) {
    var M = this
      ;

    // StSession.subscribe(redirect, $scope);

    M.submitted = false;
    M.contactForm = {};
    M.contact = function () {
      M.pending = true;
      $http.post(StApi.apiPreix + '/guest/contactus', S.contactForm).then(function () {
        M.pending = false;
        M.submitted = true;
      }, function () {
        window.alert("There was an error sending your message.");
      });
    };

    $scope.myInterval = 5000;
    var slides = $scope.slides = [];
    $scope.addSlide = function(img) {
      // var newWidth = 600 + slides.length;
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
