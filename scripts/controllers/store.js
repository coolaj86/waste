'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:StoreCtrl
 * @description
 * # StoreCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('StoreCtrl', function ($scope, Stripe) {
    var S = this
      ;

    function getImgUrl(url) {
      return 'http://images.coolaj86.com/api/resize/width/100?url=' + url;
    }

    S.products = [
      { title: "gizmo"
      , desc: "One of thems doodad doohickeys that do stuff"
      , amount: 37
      , imgsrc: getImgUrl("http://www.reenigne.org/photos/2004/4/doodads.jpg")
      }
    , { title: "sproket"
      , desc: "Replacement sprocket for all model M gadgets and gizmos"
      , amount: 1197
      , imgsrc: getImgUrl("http://2.imimg.com/data2/VR/DH/MY-1977734/tvs-xl-super-h-duty-250x250.jpg")
      }
    , { title: "doohickey"
      , desc: "Model S doohickey - includes all 6-series thing-a-mobobs and -majigs."
      , amount: 3897
      , imgsrc: getImgUrl("http://img.izismile.com/img/img6/20131102/640/awesome_musthave_gizmos_and_gadgets_640_18.jpg")
      }
    , { title: "whatchamacallit"
      , desc: "Useful for mind control, air bending, etc. iThink compatible"
      , amount: 699997
      , imgsrc: getImgUrl("http://cdn.trendhunterstatic.com/thumbs/next-hot-gizmo-apple-ithink-concept-underway.jpeg")
      }
    ];

    S.subscriptions = [
      { title: "Newfangled!"
      , desc: "All of the latest news about the hottest swag."
      , amount: 550
      , period: 'month'
      , periodly: 'monthly'
      , imgsrc: getImgUrl("http://www.jaimecalayo.com/sda/website/images/index_newfangled.jpg")
      }
    ];

    S.buy = function (product) {
      Stripe.purchase(product).then(
        function () {
          console.log('Bought the ', product.title);
        }
      , function () {
          console.log('Missed out on the opportunity of a lifetime ', product.title);
        }
      );
    };
  });
