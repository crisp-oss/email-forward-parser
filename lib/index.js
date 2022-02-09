"use strict";


var Parser = require("./parser");


/**
 * EmailForwardParser
 * @class
 */
class EmailForwardParser {
  /**
   * Constructor
   */
  constructor() {
    this.parser = new Parser();
  }

  /**
   * Attempts to parse a forwarded email
   * @public
   * @param  {string} body
   * @param  {string} subject
   * @return {object} The parsed email
   */
  read(body, subject = null) {
    var _subject = null;
    var _email = {};
    var _result = {};

    // Check if email was forwarded or not (via the subject)
    if (subject) {
      _subject = this.parser.parseSubject(subject);
    }

    var _forwarded = ((subject && _subject !== null) && true) || false;

    // Check if email was forwarded or not (via the body)
    if (!subject || _forwarded) {
      _result = this.parser.parseBody(body, _forwarded);

      if (_result.email) {
        _forwarded = true;

        _email = this.parser.parseOriginalEmail(_result.email, _result.body);
      }
    }

    return {
      forwarded : _forwarded,

      message   : _result.message || null,

      email     : {
        body    : _email.body,

        from    : {
          address : (_email.from || {}).address,
          name    : (_email.from || {}).name
        },

        to      : _email.to,

        cc      : _email.cc,

        subject : _subject || _email.subject,
        date    : _email.date
      }
    }
  };
};


module.exports = EmailForwardParser;
