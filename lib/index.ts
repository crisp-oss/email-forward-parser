/*
 * This file is part of email-forward-parser
 *
 * Copyright (c) 2026 Crisp IM SAS
 * All rights belong to Crisp IM SAS
 */

/**************************************************************************
 * IMPORTS
 ***************************************************************************/

// PROJECT: LIB
import Parser from "./parser.js";

/**************************************************************************
 * TYPES
 ***************************************************************************/

interface EmailForwardMailbox {
  address: string | null;
  name: string | null;
}

interface EmailForwardEmail {
  body?: string;
  from: EmailForwardMailbox;
  to?: EmailForwardMailbox | EmailForwardMailbox[] | null;
  cc?: EmailForwardMailbox | EmailForwardMailbox[] | null;
  subject: string | null;
  date?: string | null;
}

interface EmailForwardBody {
  body?: string;
  message?: string;
  email?: string;
}

interface EmailForwardResult {
  forwarded: boolean;
  message: string | null;
  email: EmailForwardEmail;
}

/**************************************************************************
 * EMAIL FORWARD PARSER
 ***************************************************************************/

/**
 * EmailForwardParser
 * @class
 */
class EmailForwardParser {
  private parser: Parser;

  /**
   * Constructor
   */
  constructor() {
    this.parser = new Parser();
  }

  /**
   * Attempts to parse a forwarded email
   */
  read(body: string, subject: string | null = null): EmailForwardResult {
    let parsedSubject: string | null = null;
    let parsedEmail: Partial<EmailForwardEmail> = {};
    let parsedResult: EmailForwardBody = {};

    // Check if email was forwarded or not (via the subject)
    if (subject) {
      parsedSubject = this.parser.parseSubject(subject);
    }

    let forwarded = ((subject && parsedSubject !== null) && true) || false;

    // Check if email was forwarded or not (via the body)
    if (!subject || forwarded) {
      parsedResult = this.parser.parseBody(body, forwarded);

      if (parsedResult.email) {
        forwarded = true;

        parsedEmail = this.parser.parseOriginalEmail(
          parsedResult.email, parsedResult.body
        );
      }
    }

    return {
      forwarded: forwarded,

      message: parsedResult.message || null,

      email: {
        body: parsedEmail.body,

        from: {
          address: parsedEmail.from?.address,
          name: parsedEmail.from?.name
        },

        to: parsedEmail.to,

        cc: parsedEmail.cc,

        subject: parsedSubject || parsedEmail.subject,
        date: parsedEmail.date
      }
    };
  }
}

/**************************************************************************
 * EXPORTS
 ***************************************************************************/

export default EmailForwardParser;

export type { EmailForwardMailbox, EmailForwardEmail, EmailForwardResult };
