'use strict';

/**
 * @ngdoc service
 * @name steve.StApi
 * @description
 * # StApi
 * Service in the steve.
 */
(function () {

  window.googleAnalyticsToken = 'UA-XXXXXXXX-1';
  // window.StApi

  var x = window.StClientConfig
    ;

  // TODO move to initialization for mian
  x.business = {
    "title": "ACME Crop"
  , "tagline": "Family-friendly goods and services from a company that makes everything."
  , "tagline2": "Doing a lot of awesome with our crazy tagline here. Make sure to check out the amazing video"
  , "facebookLike": "http://example.com" // your page
  , "googlePlusOne": "https://plus.google.com/+google" // your page
  , "personName": "John Doe"
  , "personTitle": "Hotshot, Ladder-climber, #1"
  , "logo": "http://upload.wikimedia.org/wikipedia/en/7/7e/Oldacmelogo.png"
  , "pic": "http://api.randomuser.me/portraits/men/10.jpg"
  //, video: "https://d2pq0u4uni88oo.cloudfront.net/projects/392582/video-186252-h264_high.mp4"
  , "video": "//www.youtube.com/embed/dFdIxE9tqO0"
  , "videoPoster": "https://s3.amazonaws.com/ksr/projects/392582/photo-main.jpg?1397803142"
  , "email": "john.doe@mail.com"
  , "phoneIntl": "+15552220123"
  , "phone": "(555) 222-0123"
  , "city": "Baywatch"
  , "st": "CA"
  , "state": "California"
  , "zip": "90210"
  , "zipExt": null
  , "slides": [
      "https://s3.amazonaws.com/ksr/projects/392582/photo-main.jpg?1397803142"
    , "http://img4.wikia.nocookie.net/__cb20100821210849/familyguy/images/7/7d/ACME.png"
    , "http://upload.wikimedia.org/wikipedia/commons/2/25/Acme-auto_1906_ad.jpg"
    , "http://home.roadrunner.com/~tuco/looney/acme/doit.jpg"
    ]
  };

  angular.module('steve', [])
    .constant('stConfig', x)
//
/*
  .provider('StConfigProvider', function StConfigProvider() {
    var me = this || {}
      ;

    Object.keys(x).forEach(function (k) {
      me[k] = x[k];
    });

    
    // return x;
  })
// */
  .service('StApi', function StApi() {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var me = this
      ;

    Object.keys(x).forEach(function (k) {
      me[k] = x[k];
    });

    //return me;
  });
}());
