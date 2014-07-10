'use strict';

/**
 * @ngdoc service
 * @name yololiumApp.StApi
 * @description
 * # StApi
 * Service in the yololiumApp.
 */
angular.module('yololiumApp')
  .service('StApi', function StApi() {
    // AngularJS will instantiate a singleton by calling "new" on this function
    return {
      apiPrefix: '/api'
    , oauthPrefix: '/oauth'
    , testProfiles: [
        { "role": "superuser"
        , "token": "xxxxxxxx-test-xxxx-xxxx-root-xxxxxx"
        }
      , { "role": "admin"
        , "token": "xxxxxxxx-test-xxxx-xxxx-admin-xxxxxx"
        }
      , { "role": "user"
        , "token": "xxxxxxxx-test-xxxx-xxxx-user-xxxxxxx"
        }
      , { "role": "guest"
        , "token": "xxxxxxxx-test-xxxx-xxxx-guest-xxxxxx"
        }
      ]
    , stripe: {
        publicKey: 'pk_test_526DRmZwEOiMxTigV5fX52ti'
      , storeName: 'Business Name Here'
      }
    , loginProviders: {
        facebook: '/facebook/connect'
      , twitter: '/twitter/authn/connect'
      , tumblr: '/tumblr/connect'
      , ldsconnect: '/ldsconnect/connect'
      }
    , business: {
        title: "ACME Crop"
      , tagline: "Family-friendly goods and services from a company that makes everything."
      , logo: "http://upload.wikimedia.org/wikipedia/en/7/7e/Oldacmelogo.png"
      , pic: "http://api.randomuser.me/portraits/men/10.jpg"
      , video: "//www.youtube.com/embed/dFdIxE9tqO0"
      //, video: "https://d2pq0u4uni88oo.cloudfront.net/projects/392582/video-186252-h264_high.mp4"
      , slides: [
          "https://s3.amazonaws.com/ksr/projects/392582/photo-main.jpg?1397803142"
        , "http://img4.wikia.nocookie.net/__cb20100821210849/familyguy/images/7/7d/ACME.png"
        , "http://upload.wikimedia.org/wikipedia/commons/2/25/Acme-auto_1906_ad.jpg"
        , "http://home.roadrunner.com/~tuco/looney/acme/doit.jpg"
        ]
      }
    };
  });
