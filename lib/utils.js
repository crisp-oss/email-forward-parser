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
 * @param  {object}  regexes
 * @param  {string}  str
 * @param  {string}  [mode]
 * @param  {boolean} [highestPosition]
 * @return {object}  The result of the first successfull regular expression
 */
var loopRegexes = function(
  regexes, str, mode = "match", highestPosition = true
) {
  var _match;

  for (var _i = 0; _i < regexes.length; _i++) {
    var _regex = regexes[_i];

    if (typeof regexes[_i] === "string") {
      // Build the regex
      _regex = new RE2(regexes[_i]);
    }

    var _currentMatch = (
      _regex[mode](str || "", mode === "replace" ? "" : undefined)
    );

    if (mode === "replace") {
      _match = _currentMatch;

      // A successfull replace must return a smaller string than the input
      var _maxLength = str.length;

      if (_match.length < _maxLength) {
        break;
      }
    } else if (mode === "split" || mode === "match") {
      // A successfull split must return an array with at least two items
      var _minLength = mode === "split" ? 1 : 0;

      if ((_currentMatch || []).length > _minLength) {
        if (highestPosition === true) {
          // No previous match?
          if (!_match) {
            // Save match and continue looking for other matches
            _match = _currentMatch;
          } else {
            var _higher;

            if (mode === "match") {
              _higher = _match.index > _currentMatch.index;
            } else if (mode === "split") {
              _higher = (
                _match.length === _currentMatch.length &&
                  _match[0].length > _currentMatch[0].length
              );
            }

            // Match higher positioned than previous one?
            if (_higher) {
              // Replace match and continue looking for other matches
              _match = _currentMatch;
            }
          }
        } else {
          // Save match and stop
          _match = _currentMatch;

          break;
        }
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
