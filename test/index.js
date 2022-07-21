"use strict";

/**************************************************************************
 * IMPORTS
 ***************************************************************************/

var fs                 = require("fs");
var EmailForwardParser = require("../lib/index.js");

/**************************************************************************
 * CONFIGURATION
 ***************************************************************************/

const COMMON_SUBJECT = "Integer consequat non purus";
const COMMON_DATE = "25 October 2021 at 11:17:21 EEST";

const COMMON_FROM_ADDRESS = "john.doe@acme.com";
const COMMON_FROM_NAME = "John Doe";

const COMMON_TO_ADDRESS = "bessie.berry@acme.com";

const COMMON_BODY = "Aenean quis diam urna. Maecenas eleifend vulputate ligula ac consequat. Pellentesque cursus tincidunt mauris non venenatis.\nSed nec facilisis tellus. Nunc eget eros quis ex congue iaculis nec quis massa. Morbi in nisi tincidunt, euismod ante eget, eleifend nisi.\n\nPraesent ac ligula orci. Pellentesque convallis suscipit mi, at congue massa sagittis eget.";

const COMMON_MESSAGE = "Praesent suscipit egestas hendrerit.\n\nAliquam eget dui dui.";

const TO_ADDRESS_1 = "bessie.berry@acme.com";
const TO_NAME_1 = "Bessie Berry";
const TO_ADDRESS_2 = "suzanne@globex.corp";
const TO_NAME_2 = "Suzanne";

const CC_ADDRESS_1 = "walter.sheltan@acme.com";
const CC_NAME_1 = "Walter Sheltan";
const CC_ADDRESS_2 = "nicholas@globex.corp";
const CC_NAME_2 = "Nicholas";

const parser = new EmailForwardParser();

/**************************************************************************
 * TESTS
 ***************************************************************************/

function loopTests(entries, testFn) {
  entries.forEach((entry) => {
    var result;

    // Provide subject?
    if (Array.isArray(entry)) {
      result = parseEmail(entry[0], entry[1]);
    } else {
      result = parseEmail(entry);
    }

    if (typeof testFn === "function") {
      var _entryName = Array.isArray(entry) ? entry[0] : entry;

      testFn(result, _entryName);
    }
  });
}

function parseEmail(emailFile, subjectFile = null) {
  var subject = null;

  var email = fs.readFileSync(`${__dirname}/fixtures/${emailFile}.txt`, "utf-8");

  if (subjectFile) {
    var subject = fs.readFileSync(`${__dirname}/fixtures/${subjectFile}.txt`, "utf-8");
  }

  return parser.read(email, subject);
}

function testCommonEmail(
  test, result, skipTo = false, skipCc = false, skipMessage = false
) {
  var email = result.email || {};

  test.strictEqual(result.forwarded, true);

  test.strictEqual(email.subject, COMMON_SUBJECT);

  // Don't verify the value, as dates are localized by the email client
  test.strictEqual(typeof email.date, "string");
  test.strictEqual((email.date || "").length > 1, true);

  test.strictEqual((email.from || {}).address, COMMON_FROM_ADDRESS);
  test.strictEqual((email.from || {}).name, COMMON_FROM_NAME);

  if (skipTo !== true) {
    test.strictEqual(((email.to || [])[0] || {}).address, COMMON_TO_ADDRESS);
    test.strictEqual(((email.to || [])[0] || {}).name, null);
  }

  if (skipCc !== true) {
    test.strictEqual(((email.cc || [])[0] || {}).address, CC_ADDRESS_1);
    test.strictEqual(((email.cc || [])[0] || {}).name, CC_NAME_1);
    test.strictEqual(((email.cc || [])[1] || {}).address, CC_ADDRESS_2);
    test.strictEqual(((email.cc || [])[1] || {}).name, CC_NAME_2);
  }

  test.strictEqual(email.body, COMMON_BODY);

  if (skipMessage !== true) {
    test.strictEqual(result.message, COMMON_MESSAGE);
  }
}

module.exports = {
  // Test: common (no message, To, multiple Cc)
  testCommon: function(test) {
    loopTests(
      [
        "apple_mail_cs_body",
        "apple_mail_da_body",
        "apple_mail_de_body",
        "apple_mail_en_body",
        "apple_mail_es_body",
        "apple_mail_fi_body",
        "apple_mail_fr_body",
        "apple_mail_hr_body",
        "apple_mail_hu_body",
        "apple_mail_it_body",
        "apple_mail_nl_body",
        "apple_mail_no_body",
        "apple_mail_pl_body",
        "apple_mail_pt_br_body",
        "apple_mail_pt_body",
        "apple_mail_ro_body",
        "apple_mail_ru_body",
        "apple_mail_sk_body",
        "apple_mail_sv_body",
        "apple_mail_tr_body",
        "apple_mail_uk_body",

        "gmail_cs_body",
        "gmail_da_body",
        "gmail_de_body",
        "gmail_en_body",
        "gmail_es_body",
        "gmail_et_body",
        "gmail_fi_body",
        "gmail_fr_body",
        "gmail_hr_body",
        "gmail_hu_body",
        "gmail_it_body",
        "gmail_nl_body",
        "gmail_no_body",
        "gmail_pl_body",
        "gmail_pt_br_body",
        "gmail_pt_body",
        "gmail_ro_body",
        "gmail_ru_body",
        "gmail_sk_body",
        "gmail_sv_body",
        "gmail_tr_body",
        "gmail_uk_body",

        "missive_en_body",

        ["outlook_live_body", "outlook_live_cs_subject"],
        ["outlook_live_body", "outlook_live_da_subject"],
        ["outlook_live_body", "outlook_live_de_subject"],
        ["outlook_live_body", "outlook_live_en_subject"],
        ["outlook_live_body", "outlook_live_es_subject"],
        ["outlook_live_body", "outlook_live_fr_subject"],
        ["outlook_live_body", "outlook_live_hr_subject"],
        ["outlook_live_body", "outlook_live_hu_subject"],
        ["outlook_live_body", "outlook_live_it_subject"],
        ["outlook_live_body", "outlook_live_nl_subject"],
        ["outlook_live_body", "outlook_live_no_subject"],
        ["outlook_live_body", "outlook_live_pl_subject"],
        ["outlook_live_body", "outlook_live_pt_br_subject"],
        ["outlook_live_body", "outlook_live_pt_subject"],
        ["outlook_live_body", "outlook_live_ro_subject"],
        ["outlook_live_body", "outlook_live_sk_subject"],
        ["outlook_live_body", "outlook_live_sv_subject"],

        ["outlook_2013_en_body", "outlook_2013_en_subject"],

        ["new_outlook_2019_cs_body", "new_outlook_2019_cs_subject"],
        ["new_outlook_2019_da_body", "new_outlook_2019_da_subject"],
        ["new_outlook_2019_de_body", "new_outlook_2019_de_subject"],
        ["new_outlook_2019_en_body", "new_outlook_2019_en_subject"],
        ["new_outlook_2019_es_body", "new_outlook_2019_es_subject"],
        ["new_outlook_2019_fi_body", "new_outlook_2019_fi_subject"],
        ["new_outlook_2019_fr_body", "new_outlook_2019_fr_subject"],
        ["new_outlook_2019_hu_body", "new_outlook_2019_hu_subject"],
        ["new_outlook_2019_it_body", "new_outlook_2019_it_subject"],
        ["new_outlook_2019_nl_body", "new_outlook_2019_nl_subject"],
        ["new_outlook_2019_no_body", "new_outlook_2019_no_subject"],
        ["new_outlook_2019_pl_body", "new_outlook_2019_pl_subject"],
        ["new_outlook_2019_pt_br_body", "new_outlook_2019_pt_br_subject"],
        ["new_outlook_2019_pt_body", "new_outlook_2019_pt_subject"],
        ["new_outlook_2019_ru_body", "new_outlook_2019_ru_subject"],
        ["new_outlook_2019_sk_body", "new_outlook_2019_sk_subject"],
        ["new_outlook_2019_sv_body", "new_outlook_2019_sv_subject"],
        ["new_outlook_2019_tr_body", "new_outlook_2019_tr_subject"],

        ["outlook_2019_cz_body", "outlook_2019_subject"],
        ["outlook_2019_da_body", "outlook_2019_subject"],
        ["outlook_2019_de_body", "outlook_2019_subject"],
        ["outlook_2019_en_body", "outlook_2019_subject"],
        ["outlook_2019_es_body", "outlook_2019_subject"],
        ["outlook_2019_fi_body", "outlook_2019_subject"],
        ["outlook_2019_fr_body", "outlook_2019_subject"],
        ["outlook_2019_hu_body", "outlook_2019_subject"],
        ["outlook_2019_it_body", "outlook_2019_subject"],
        ["outlook_2019_nl_body", "outlook_2019_subject"],
        ["outlook_2019_no_body", "outlook_2019_subject"],
        ["outlook_2019_pl_body", "outlook_2019_subject"],
        ["outlook_2019_pt_body", "outlook_2019_subject"],
        ["outlook_2019_ru_body", "outlook_2019_subject"],
        ["outlook_2019_sk_body", "outlook_2019_subject"],
        ["outlook_2019_sv_body", "outlook_2019_subject"],
        ["outlook_2019_tr_body", "outlook_2019_subject"],

        "thunderbird_cs_body",
        "thunderbird_da_body",
        "thunderbird_de_body",
        "thunderbird_en_body",
        "thunderbird_es_body",
        "thunderbird_fi_body",
        "thunderbird_fr_body",
        "thunderbird_hr_body",
        "thunderbird_hu_body",
        "thunderbird_it_body",
        "thunderbird_nl_body",
        "thunderbird_no_body",
        "thunderbird_pl_body",
        "thunderbird_pt_br_body",
        "thunderbird_pt_body",
        "thunderbird_ro_body",
        "thunderbird_ru_body",
        "thunderbird_sk_body",
        "thunderbird_sv_body",
        "thunderbird_tr_body",
        "thunderbird_uk_body",

        "yahoo_cs_body",
        "yahoo_da_body",
        "yahoo_de_body",
        "yahoo_en_body",
        "yahoo_es_body",
        "yahoo_fi_body",
        "yahoo_fr_body",
        "yahoo_hu_body",
        "yahoo_it_body",
        "yahoo_nl_body",
        "yahoo_no_body",
        "yahoo_pl_body",
        "yahoo_pt_body",
        "yahoo_pt_br_body",
        "yahoo_ro_body",
        "yahoo_ru_body",
        "yahoo_sk_body",
        "yahoo_sv_body",
        "yahoo_tr_body",
        "yahoo_uk_body"
      ],

      (result, entryName) => {
        // Notice: do not test To and Cc, as Outlook 2019 simply doesn't embed them
        testCommonEmail(
          test,
          result,

          entryName.startsWith("outlook_2019_") ? true : false, //- [skipTo]
          entryName.startsWith("outlook_2019_") ? true : false, //- [skipCc]
          true //- [skipMessage]
        );

        test.strictEqual(result.message, null);
      }
    );

    test.done();
  },

  // Test: alternative 1 (no Cc, multiple To)
  testAlternative1: function(test) {
    loopTests(
      [
        "apple_mail_en_body_alt_1",
        "gmail_en_body_alt_1",
        "missive_en_body_alt_1",
        ["outlook_live_en_body_alt_1", "outlook_live_en_subject"],
        ["new_outlook_2019_en_body_alt_1", "new_outlook_2019_en_subject"],
        "yahoo_en_body_alt_1",
        "thunderbird_en_body_alt_1"
      ],

      (result) => {
        testCommonEmail(
          test,
          result,

          true, //- [skipTo]
          true, //- [skipCc]
          true //- [skipMessage]
        );

        test.strictEqual(((result.email.to || [])[0] || {}).address, TO_ADDRESS_1);
        test.strictEqual(((result.email.to || [])[1] || {}).address, TO_ADDRESS_2);
        test.strictEqual(((result.email.cc || [])[0] || {}).address, null);
        test.strictEqual(((result.email.cc || [])[0] || {}).name, null);
      }
    );

    test.done();
  },

  // Test: alternative 2 (with message)
  testAlternative2: function(test) {
    loopTests(
      [
        "apple_mail_en_body_alt_2",
        "gmail_en_body_alt_2",
        "missive_en_body_alt_2",
        ["outlook_live_en_body_alt_2", "outlook_live_en_subject"],
        ["new_outlook_2019_en_body_alt_2", "new_outlook_2019_en_subject"],
        ["outlook_2019_en_body_alt_2", "outlook_2019_subject"],
        "yahoo_en_body_alt_2",
        "thunderbird_en_body_alt_2"
      ],

      (result, entryName) => {
        // Notice: do not test Cc, as Outlook 2019 simply doesn't embed them
        testCommonEmail(
          test,
          result,

          true, //- [skipTo]
          entryName === "outlook_2019_en_body_alt_2" ? true : false //- [skipCc]
        );

        // Notice: do not test To, as Outlook 2019 simply doesn't embed them
        if (entryName !== "outlook_2019_en_body_alt_2") {
          test.strictEqual(((result.email.to || [])[0] || {}).address, TO_ADDRESS_1);
          test.strictEqual(((result.email.to || [])[1] || {}).address, TO_ADDRESS_2);
        }
      }
    );

    test.done();
  },

  // Test: alternative 3 (different forms of From / To / Cc)
  testAlternative3: function(test) {
    loopTests(
      [
        "apple_mail_en_body_alt_3",
        "gmail_en_body_alt_3",
        "missive_en_body_alt_3",
        ["outlook_live_en_body_alt_3", "outlook_live_en_subject"],
        ["new_outlook_2019_en_body_alt_3", "new_outlook_2019_en_subject"],
        "yahoo_en_body_alt_3",
        "thunderbird_en_body_alt_3"
      ],

      (result) => {
        testCommonEmail(
          test,
          result,

          true, //- [skipTo]
          true, //- [skipCc]
          true //- [skipMessage]
        );

        test.strictEqual(((result.email.to || [])[0] || {}).address, TO_ADDRESS_1);
        test.strictEqual(((result.email.to || [])[0] || {}).name, TO_NAME_1);
        test.strictEqual(((result.email.to || [])[1] || {}).address, TO_ADDRESS_2);
        test.strictEqual(((result.email.to || [])[1] || {}).name, null);

        test.strictEqual(((result.email.cc || [])[0] || {}).address, CC_ADDRESS_1);
        test.strictEqual(((result.email.cc || [])[0] || {}).name, null);
        test.strictEqual(((result.email.cc || [])[1] || {}).address, CC_ADDRESS_2);
        test.strictEqual(((result.email.cc || [])[1] || {}).name, CC_NAME_2);
      }
    );

    test.done();
  },

  // Test: alternative 4 (not-forwarded)
  testAlternative4: function(test) {
    loopTests(
      [
        "apple_mail_en_body_alt_4",
        "gmail_en_body_alt_4",
        "missive_en_body_alt_4",
        ["outlook_live_en_body_alt_4", "outlook_live_en_subject_alt_4"],
        ["new_outlook_2019_en_body_alt_4", "new_outlook_2019_en_subject_alt_4"],
        ["outlook_2019_en_body_alt_4", "outlook_2019_en_subject_alt_4"],
        "yahoo_en_body_alt_4",
        "thunderbird_en_body_alt_4"
      ],

      (result) => {
        test.equal(result.forwarded, false);
      }
    );

    test.done();
  },

  // Test: alternative 5 (no name for From)
  testAlternative5: function(test) {
    loopTests(
      [
        "apple_mail_en_body_alt_5"
      ],

      (result) => {
        test.strictEqual((result.email.from || {}).address, COMMON_FROM_ADDRESS);
        test.strictEqual((result.email.from || {}).name, null);
      }
    );

    test.done();
  },

  // Test: alternative 6 (with Reply-To)
  testAlternative6: function(test) {
    loopTests(
      [
        "apple_mail_en_body_alt_6"
      ],

      (result) => {
        testCommonEmail(
          test,
          result,

          false, //- [skipTo]
          true, //- [skipCc]
          true //- [skipMessage]
        );
      }
    );

    test.done();
  },

  // Test: alternative 7 (with quotes-wrapped names for To)
  testAlternative7: function(test) {
    loopTests(
      [
        "apple_mail_en_body_alt_7"
      ],

      (result) => {
        testCommonEmail(
          test,
          result,

          true, //- [skipTo]
          true, //- [skipCc]
          true //- [skipMessage]
        );

        test.strictEqual(((result.email.to || [])[0] || {}).address, TO_ADDRESS_1);
        test.strictEqual(((result.email.to || [])[0] || {}).name, "Bessie, Berry");
        test.strictEqual(((result.email.to || [])[1] || {}).address, TO_ADDRESS_2);
        test.strictEqual(((result.email.to || [])[1] || {}).name, TO_NAME_2);

        test.strictEqual(((result.email.cc || [])[0] || {}).address, CC_ADDRESS_1);
        test.strictEqual(((result.email.cc || [])[0] || {}).name, null);
        test.strictEqual(((result.email.cc || [])[1] || {}).address, CC_ADDRESS_2);
        test.strictEqual(((result.email.cc || [])[1] || {}).name, null);
      }
    );

    test.done();
  },

  // Test: alternative 8 (misleading signature)
  testAlternative8: function(test) {
    loopTests(
      [
        "outlook_live_en_body_alt_8"
      ],

      (result) => {
        testCommonEmail(
          test,
          result
        );
      }
    );

    test.done();
  },

  // Test: alternative 9 (multiple From)
  testAlternative9: function(test) {
    loopTests(
      [
        "outlook_live_en_body_alt_9"
      ],

      (result) => {
        testCommonEmail(
          test,
          result
        );
      }
    );

    test.done();
  },

  // Test: alternative 10 (no separator and different forms of labels)
  testAlternative10: function(test) {
    loopTests(
      [
        ["outlook_live_en_body_alt_10", "outlook_live_en_subject_alt_10"]
      ],

      (result) => {
        testCommonEmail(
          test,
          result
        );
      }
    );

    test.done();
  },

  // Test: alternative 11 (coma in From)
  testAlternative11: function(test) {
    loopTests(
      [
        "outlook_live_en_body_alt_11"
      ],

      (result) => {
        test.strictEqual((result.email.from || {}).address, COMMON_FROM_ADDRESS);
        test.strictEqual((result.email.from || {}).name, "John, Doe");

        test.strictEqual(((result.email.to || [])[0] || {}).address, TO_ADDRESS_1);
        test.strictEqual(((result.email.to || [])[0] || {}).name, "Bessie, Berry");
        test.strictEqual(((result.email.to || [])[1] || {}).address, TO_ADDRESS_2);
        test.strictEqual(((result.email.to || [])[1] || {}).name, null);

        test.strictEqual(((result.email.cc || [])[0] || {}).address, CC_ADDRESS_1);
        test.strictEqual(((result.email.cc || [])[0] || {}).name, "Walter, Sheltan");
        test.strictEqual(((result.email.cc || [])[1] || {}).address, CC_ADDRESS_2);
        test.strictEqual(((result.email.cc || [])[1] || {}).name, "Nicholas, Landers");
      }
    );

    test.done();
  }
}
