'use strict';

    // http://codepen.io/coolaj86/pen/eDAKh
    // https://gist.github.com/coolaj86/9062510
    // /(?=^|\D)(\+?1)?\s*[\-\.]?\s*\(?\s*(\d{3})\s*\)?\s*[\-\.]?\s*(\d{3})\s*[\-\.]?\s*(\d{4})(?=\D|$)/g
var re = /(\+?1)?\s*[\-\.]?\s*\(?\s*([2-9]\d{2})\s*\)?\s*[\-\.]?\s*(\d{3})\s*[\-\.]?\s*(\d{4})(?=\D|$)/g
  ;

module.exports.formatNumber = function (number, format) {
  if ('string' !== typeof number) {
    if ('number' !== typeof number) {
      return null;
    }
    number = number.toString();
  }

  // recreate the RegExp to avoid oopsies with .exec()
  var reUsNum = new RegExp(re)
    ;

  if (!reUsNum.test(number)) {
    return null;
  }

  format = format || '+1 ($1) $2-$3';


  return number.replace(reUsNum, format);
};
