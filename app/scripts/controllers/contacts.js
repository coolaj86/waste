'use strict';

angular.module('yololiumApp')
  .controller('ContactsCtrl', function () {
    var C = this
      ;

    C.nodes = [
      { "type": "email"
      , "node": "asdf@asdf.asdf"
      }
    , { "type": "phone"
      , "node": "800-111-1111"
      }
    ];
  });
