"use strict";

Object.defineProperty(exports, "__esModule", {
  value : true
});


/**************************************************************************
 * IMPORTS
 ***************************************************************************/

var { parseSubject, parseBody, parseOriginalEmail } = require("./parser");


/**************************************************************************
 * FUNCTIONS
 ***************************************************************************/

/**
 * Attempts to parse a forwarded email
 * @public
 * @param  {string} body
 * @param  {string} subject
 * @return {object} The parsed email
 */
var read = function(body, subject = null) {
  var _subject = null;
  var _email = {};
  var _result = {};

  // Check if email was forwarded or not (via the subject)
  if (subject) {
    _subject = parseSubject(subject);
  }

  var _forwarded = ((subject && _subject) && true) || false;

  // Check if email was forwarded or not (via the body)
  if (!subject || _forwarded) {
    _result = parseBody(body, _forwarded);

    if (_result.email) {
      _forwarded = true;

      _email = parseOriginalEmail(_result.email, body);
    }
  }

  return {
    forwarded : _forwarded,

    message   : _result.message || null,

    email     : {
      body    : _email.body,

      from    : {
        email : (_email.from || {}).email,
        name  : (_email.from || {}).name
      },

      to      : _email.to,

      cc      : _email.cc,

      subject : _subject || _email.subject,
      date    : _email.date
    }
  }
};


/**************************************************************************
 * EXPORTS
 ***************************************************************************/

exports.read    = read;

exports.default = {
  read : read
};
