(function () {
  'use strict';

  function require(thing) {
    console.log(thing);
    thing = thing.replace(/-[a-z]/g, function (a) { return a[1].toUpperCase(); });
    console.log(thing);
    var obj = {}
      ;

    obj[thing] = window[thing];
    if (obj[thing]) {
      obj[thing][thing] = window[thing];
    }
    return window[thing];
  }

  window.require = window.require || require;
}());
