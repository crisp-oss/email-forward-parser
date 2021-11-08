"use strict";

/**************************************************************************
 * IMPORTS
 ***************************************************************************/

var RE2 = require("re2");

/**************************************************************************
 * FUNCTIONS
 ***************************************************************************/

/**
 * Executes multiple regular expressions until one succeeds
 * @public
 * @param  {object} regexes
 * @param  {string} str
 * @param  {string} [mode]
 * @return {object} The result of the first successfull regular expression
 */
var loopRegexes = function(regexes, str, mode = "match") {
  var _match;

  for (var _i = 0; _i < regexes.length; _i++) {
    var _regex = new RE2(regexes[_i]);

    _match = (
      _regex[mode](str || "", mode === "replace" ? "" : undefined)
    );

    if (mode === "replace") {
      // A successfull replace must return a smaller string than the input
      var _maxLength = str.length;

      if (_match.length < _maxLength) {
        break;
      }
    } else if (mode === "split" || mode === "match") {
      // A successfull split must return an array with at least two items
      var _minLength = mode === "split" ? 1 : 0;

      if ((_match || []).length > _minLength) {
        break;
      }
    }
  }

  return (_match || []);
}


/**
 * Trims a string
 * @public
 * @param  {string} str
 * @return {string} The trimed string
 */
var trimString = function(str) {
  return ((str || "").trim() || null)
}


/**************************************************************************
 * EXPORTS
 ***************************************************************************/

exports.loopRegexes = loopRegexes;
exports.trimString  = trimString;

exports.default = {
  loopRegexes : loopRegexes,
  trimString  : trimString
};
