# Email Forward Parser

[![Test and Build](https://github.com/crisp-oss/email-forward-parser/workflows/Test%20and%20Build/badge.svg?branch=master)](https://github.com/crisp-oss/email-forward-parser/actions?query=workflow%3A%22Test+and+Build%22) [![Build and Release](https://github.com/crisp-oss/email-forward-parser/workflows/Build%20and%20Release/badge.svg)](https://github.com/crisp-oss/email-forward-parser/actions?query=workflow%3A%22Build+and+Release%22) [![NPM](https://img.shields.io/npm/v/email-forward-parser.svg)](https://www.npmjs.com/package/email-forward-parser) [![Downloads](https://img.shields.io/npm/dt/email-forward-parser.svg)](https://www.npmjs.com/package/email-forward-parser)

Parses forwarded emails and extracts original content.

This library supports most common email clients and locales.

**😘 Maintainer**: [@eliottvincent](https://github.com/eliottvincent)

## Who uses it?

<table>
<tr>
<td align="center"><a href="https://crisp.chat/"><img src="https://crisp.chat/favicon-256x256.png" height="64" /></a></td>
</tr>
<tr>
<td align="center">Crisp</td>
</tr>
</table>

_👋 You use this library and you want to be listed there? [Contact us](https://crisp.chat/)._

## Features

This library is used at [Crisp](https://crisp.chat/) everyday with around 1 million inbound emails.
* Supported clients: Apple Mail, Gmail, Outlook Live / 365, Outlook 2013, Outlook 2019, New Outlook 2019, Yahoo Mail, Thunderbird, Missive, HubSpot, IONOS by 1 & 1
* Supported locales: Croatian, Czech, Danish, Dutch, English, French, Finnish, German, Hungarian, Italian, Japanese, Norwegian, Polish, Portuguese (Brazil), Portuguese (Portugal), Romanian, Russian, Slovak, Spanish, Swedish, Turkish, Ukrainian

## Usage

```js
const EmailForwardParser = require("email-forward-parser");

const result = new EmailForwardParser().read(MY_EMAIL_STRING);

console.log(result.forwarded);
// true
```

## API

### Parse a forwarded email

`read(body, subject)` checks whether an email was forwarded or not, and parses its original content (From, To, Cc, Subject, Date and Body):
* `body` must be a string representing the email body (as returned by [mailparser](https://github.com/nodemailer/mailparser), for example)
* `subject` must be a string representing the email subject. This parameter is optional, but recommended to improve the detection for some email clients (especially New Outlook 2019)

```js
const EmailForwardParser = require("email-forward-parser");

const result = new EmailForwardParser().read(MY_EMAIL_STRING, MY_SUBJECT_STRING);

console.log(result);
// {
//   forwarded: true,
//
//   message: "Praesent suscipit egestas hendrerit.",
//
//   email: {
//     body: "Aenean quis diam urna.",
//
//     from: {
//       address: "john.doe@acme.com",
//       name: "John Doe"
//     },
//     to: [{
//       address: "bessie.berry@acme.com",
//       name: "Bessie Berry"
//     }],
//     cc: [{
//       address: "walter.sheltan@acme.com",
//       name: "Walter Sheltan"
//     }],
//
//     subject: "Integer consequat non purus",
//     date: "25 October 2021 at 11:17:21 EEST"
//   }
// }
```

## How does it work?

Email forwarding (i.e. when you manually forward a copy of an email by clicking the "Forward" button in your email client) is not standardized by any RFC. Meaning that email clients are free to format the forwarded email the way they want.

There is no magic bullet to handle such disparities. The only viable solution is to rely on **regular expressions** (a lot!), to account for each email client's specificities:

Client | Detectable via subject | Detectable via separator | Subject localized | Separator localized | All original information available | Original information localized | Other specificities
--- | --- | --- | --- | --- | --- | --- | ---
Apple Mail | Yes | Yes | Yes | Yes | Yes | Yes | --
Gmail | Yes | Yes | No | No | Yes | Only some parts | --
Outlook Live / 365 | Yes | Yes | Yes | No | Yes | No | --
Outlook 2013 | Yes | No | ? | -- | ? | ? | --
Outlook 2019 | Yes | Yes | No | Yes | No | Yes | The From and Date parts (only original information available) are embedded in the separator, rather than the body itself
New Outlook 2019 | Yes | No | Yes | -- | Yes | Yes | --
Yahoo Mail | Yes | Yes | No | Yes | Yes | Yes | The original information are all stuck to each other, without line breaks
Thunderbird | Yes | Yes | No | Yes | Yes | Yes | --
Missive | Yes | Yes | No | No | Yes | No | --
HubSpot | Yes | Yes | Yes | Yes | Yes | Yes | --
IONOS by 1 & 1 | ? | Yes | ? | ? | Yes | ? | --

## Contributing

Feel free to fork this project and submit fixes. We may adapt your code to fit the codebase.

You can run unit tests using:

```
npm test
```

## License

email-forward-parser is released under the MIT License. See the bundled LICENSE file for details.
