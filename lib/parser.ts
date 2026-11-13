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
import {
  loopRegexes,
  reconciliateSplitMatch,
  trimString
} from "./utils.js";

/**************************************************************************
 * CONSTANTS
 ***************************************************************************/

// Patterns must stay linear on backtracking engines: no nested or adjacent unbounded quantifiers

// Line terminators, and whitespace that is not a line terminator
const NEWLINES = "\\n\\r\\u2028\\u2029";
const HS = `[^\\S${NEWLINES}]`;

// Mailbox brackets (Outlook 2019, Yahoo Mail)
const OPEN = "[\\[|<]";
const CLOSE = "[\\]|>]";
const HU_OPEN = "[\\[|<|(]";
const HU_CLOSE = "[\\]|>|)]";

const MAILBOXES_SEPARATORS = [
  ",", // Apple Mail, Gmail, New Outlook 2019, Thunderbird
  ";"  // Outlook Live / 365, Yahoo Mail
];

const LINE_REGEXES = [
  "separator",
  "original_subject",
  "original_subject_lax",
  "original_to",
  "original_reply_to",
  "original_cc",
  "original_date"
];

/**************************************************************************
 * HELPERS
 ***************************************************************************/

/**
 * Builds a regex from a raw template, so that patterns read like literals
 */
function regex(flags = "") {
  return (strings: TemplateStringsArray, ...values: string[]): RegExp => {
    return new RegExp(String.raw(strings, ...values), flags);
  };
}

const multiline = regex("m");

/**
 * Any characters up to the first STOP on the line (a single way to split, so no backtracking)
 */
function upTo(stop: string, quantifier = "*"): string {
  return `(?:(?!${stop}).)${quantifier}`;
}

/**
 * Lazily, characters matching CHAR or whole whitespace runs (never split, so never retried)
 */
function lazyWords(char: string, whitespace = HS): string {
  return `(?:${char}|${whitespace}+(?=\\S))*?`;
}

/**
 * Bracketed mailbox address, that cannot span over the next place an address could START
 */
function bracketAddress(start = OPEN): string {
  return upTo(start, "+");
}

/**
 * Unquoted sender name, that cannot span over STOP and ends before whitespace (or is blank)
 */
function bareName(stop: string | null = null): string {
  if (stop === null) {
    return `(?:.*\\S|${HS}+(?=\\S))`;
  }

  return `(?:${upTo(stop)}(?!${stop})\\S|${HS}+(?=\\S))`;
}

/**
 * Yahoo Mail "KEYWORD: NAME <EMAIL>" header, where NAME and EMAIL cannot span over KEYWORD
 */
function laxFromHeader(keyword: string): RegExp {
  const name = `.${lazyWords(`(?!${keyword}\\s?:)[^\\s\\[|<]`)}`;
  const address = `.${upTo(`${CLOSE}|${keyword}\\s?:`)}`;

  return new RegExp(`(?<!\\s)(\\s*${keyword}\\s?:(${name})\\s*${OPEN}(${address})${CLOSE})`);
}

/**
 * Removes named capture groups, to detect a separator without extracting its information
 */
function withoutGroups(pattern: RegExp): RegExp {
  return new RegExp(pattern.source.replace(/\(\?<\w+>/g, "(?:"), pattern.flags);
}

/* eslint-disable max-len */
/**************************************************************************
 * CONSTANTS
 ***************************************************************************/

const ADDRESS = bracketAddress();
const QUOTED_ADDRESS = bracketAddress(`"\\s*${OPEN}`);

const OUTLOOK_2019_SEPARATORS_WITH_INFORMATION: RegExp[] = [
  multiline`^\s?Dne\s?(?<date>.+)\,\s?(?<from_name>${bareName(",")})\s*${OPEN}(?<from_address>${ADDRESS})${CLOSE}\s?napsal\(a\)\s?:`, // Outlook 2019 (cz)
  multiline`^\s?D.\s?(?<date>.+)\s?skrev\s?\"(?<from_name>${upTo("skrev\\s?\"", "+")})\"\s*${OPEN}(?<from_address>${QUOTED_ADDRESS})${CLOSE}\s?:`, // Outlook 2019 (da)
  multiline`^\s?Am\s?(?<date>.+)\s?schrieb\s?\"(?<from_name>${upTo("schrieb\\s?\"", "+")})\"\s*${OPEN}(?<from_address>${QUOTED_ADDRESS})${CLOSE}\s?:`, // Outlook 2019 (de)
  multiline`^\s?On\s?(?<date>.+)\,\s?\"(?<from_name>${upTo(",\\s?\"", "+")})\"\s*${OPEN}(?<from_address>${QUOTED_ADDRESS})${CLOSE}\s?wrote\s?:`, // Outlook 2019 (en)
  multiline`^\s?El\s?(?<date>.+)\,\s?\"(?<from_name>${upTo(",\\s?\"", "+")})\"\s*${OPEN}(?<from_address>${QUOTED_ADDRESS})${CLOSE}\s?escribió\s?:`, // Outlook 2019 (es)
  multiline`^\s?Le\s?(?<date>.+)\,\s?«(?<from_name>${upTo(",\\s?«", "+")})»\s*${OPEN}(?<from_address>${bracketAddress(`»\\s*${OPEN}`)})${CLOSE}\s?a écrit\s?:`, // Outlook 2019 (fr)
  multiline`^\s?(?<from_name>${bareName()})\s*${OPEN}(?<from_address>${ADDRESS})${CLOSE}\s?kirjoitti\s?(?<date>${upTo(`${CLOSE}\\s?kirjoitti`, "+")})\s?:`, // Outlook 2019 (fi)
  multiline`^\s?(?<date>.+)\s?időpontban\s?(?<from_name>${bareName("időpontban")})\s*${HU_OPEN}(?<from_address>${bracketAddress(HU_OPEN)})${HU_CLOSE}\s?ezt írta\s?:`, // Outlook 2019 (hu)
  multiline`^\s?Il giorno\s?(?<date>.+)\s?\"(?<from_name>${upTo("\"", "+")})\"\s*${OPEN}(?<from_address>${QUOTED_ADDRESS})${CLOSE}\s?ha scritto\s?:`, // Outlook 2019 (it)
  multiline`^\s?Op\s?(?<date>.+)\s?heeft\s?(?<from_name>${bareName("heeft")})\s*${OPEN}(?<from_address>${ADDRESS})${CLOSE}\s?geschreven\s?:`, // Outlook 2019 (nl)
  multiline`^\s?(?<from_name>${bareName()})\s*${OPEN}(?<from_address>${ADDRESS})${CLOSE}\s?skrev følgende den\s?(?<date>${upTo(`${CLOSE}\\s?skrev følgende den`, "+")})\s?:`, // Outlook 2019 (no)
  multiline`^\s?Dnia\s?(?<date>.+)\s?„(?<from_name>${upTo("„", "+")})”\s*${OPEN}(?<from_address>${bracketAddress(`”\\s*${OPEN}`)})${CLOSE}\s?napisał\s?:`, // Outlook 2019 (pl)
  multiline`^\s?Em\s?(?<date>.+)\,\s?\"(?<from_name>${upTo(",\\s?\"", "+")})\"\s*${OPEN}(?<from_address>${QUOTED_ADDRESS})${CLOSE}\s?escreveu\s?:`, // Outlook 2019 (pt)
  multiline`^\s?(?<date>.+)\s?пользователь\s?\"(?<from_name>${upTo("пользователь\\s?\"", "+")})\"\s*${OPEN}(?<from_address>${QUOTED_ADDRESS})${CLOSE}\s?написал\s?:`, // Outlook 2019 (ru)
  multiline`^\s?(?<date>.+)\s?používateľ\s?(?<from_name>${bareName("používateľ")})\s*\(${OPEN}(?<from_address>${bracketAddress(`\\(${OPEN}`)})${CLOSE}\)\s?napísal\s?:`, // Outlook 2019 (sk)
  multiline`^\s?Den\s?(?<date>.+)\s?skrev\s?\"(?<from_name>${upTo("skrev\\s?\"", "+")})\"\s*${OPEN}(?<from_address>${QUOTED_ADDRESS})${CLOSE}\s?följande\s?:`, // Outlook 2019 (sv)
  multiline`^\s?\"(?<from_name>.+)\"\s*${OPEN}(?<from_address>${QUOTED_ADDRESS})${CLOSE}\,\s?(?<date>${upTo(`${CLOSE},`, "+")})\s?tarihinde şunu yazdı\s?:` // Outlook 2019 (tr)
];

const REGEXES: Record<string, RegExp | RegExp[]> = {
  quote_line_break: /^(>+)\s?$/gm, // Apple Mail, Missive
  quote: /^(>+)\s?/gm, // Apple Mail
  four_spaces: /^(\ {4})\s?/gm, // Outlook 2019
  carriage_return: /\r\n/gm, // Outlook 2019
  byte_order_mark: /\uFEFF/gm, // Outlook 2019
  trailing_non_breaking_space: /\u00A0$/gm, // IONOS by 1 & 1
  non_breaking_space: /\u00A0/gm, // HubSpot

  subject: [
    /^Fw:(.*)/m, // Outlook Live / 365 (cs, en, hr, hu, sk), Yahoo Mail (all locales)
    /^VS:(.*)/m, // Outlook Live / 365 (da), New Outlook 2019 (da)
    /^WG:(.*)/m, // Outlook Live / 365 (de), New Outlook 2019 (de)
    /^RV:(.*)/m, // Outlook Live / 365 (es), New Outlook 2019 (es)
    /^TR:(.*)/m, // Outlook Live / 365 (fr), New Outlook 2019 (fr)
    /^I:(.*)/m, // Outlook Live / 365 (it), New Outlook 2019 (it)
    /^FW:(.*)/m, // Outlook Live / 365 (nl, pt), New Outlook 2019 (cs, en, hu, nl, pt, ru, sk), Outlook 2019 (all locales)
    /^Vs:(.*)/m, // Outlook Live / 365 (no)
    /^PD:(.*)/m, // Outlook Live / 365 (pl), New Outlook 2019 (pl)
    /^ENC:(.*)/m, // Outlook Live / 365 (pt-br), New Outlook 2019 (pt-br)
    /^Redir.:(.*)/m, // Outlook Live / 365 (ro)
    /^VB:(.*)/m, // Outlook Live / 365 (sv), New Outlook 2019 (sv)
    /^VL:(.*)/m, // New Outlook 2019 (fi)
    /^Videresend:(.*)/m, // New Outlook 2019 (no)
    /^İLT:(.*)/m, // New Outlook 2019 (tr)
    /^Fwd:(.*)/m // Gmail (all locales), Thunderbird (all locales), Missive (en), MailMate (en)
  ],

  separator: [
    multiline`^>?${HS}*Begin forwarded message\s?:`, // Apple Mail (en)
    multiline`^>?${HS}*Začátek přeposílané zprávy\s?:`, // Apple Mail (cs)
    multiline`^>?${HS}*Start på videresendt besked\s?:`, // Apple Mail (da)
    multiline`^>?${HS}*Anfang der weitergeleiteten Nachricht\s?:`, // Apple Mail (de)
    multiline`^>?${HS}*Inicio del mensaje reenviado\s?:`, // Apple Mail (es)
    multiline`^>?${HS}*Välitetty viesti alkaa\s?:`, // Apple Mail (fi)
    multiline`^>?${HS}*Début du message réexpédié\s?:`, // Apple Mail (fr)
    multiline`^>?${HS}*Début du message transféré\s?:`, // Apple Mail iOS (fr)
    multiline`^>?${HS}*Započni proslijeđenu poruku\s?:`, // Apple Mail (hr)
    multiline`^>?${HS}*Továbbított levél kezdete\s?:`, // Apple Mail (hu)
    multiline`^>?${HS}*Inizio messaggio inoltrato\s?:`, // Apple Mail (it)
    multiline`^>?${HS}*Begin doorgestuurd bericht\s?:`, // Apple Mail (nl)
    multiline`^>?${HS}*Videresendt melding\s?:`, // Apple Mail (no)
    multiline`^>?${HS}*Początek przekazywanej wiadomości\s?:`, // Apple Mail (pl)
    multiline`^>?${HS}*Início da mensagem reencaminhada\s?:`, // Apple Mail (pt)
    multiline`^>?${HS}*Início da mensagem encaminhada\s?:`, // Apple Mail (pt-br)
    multiline`^>?${HS}*Începe mesajul redirecționat\s?:`, // Apple Mail (ro)
    multiline`^>?${HS}*Начало переадресованного сообщения\s?:`, // Apple Mail (ro)
    multiline`^>?${HS}*Začiatok preposlanej správy\s?:`, // Apple Mail (sk)
    multiline`^>?${HS}*Vidarebefordrat mejl\s?:`, // Apple Mail (sv)
    multiline`^>?${HS}*İleti başlangıcı\s?:`, // Apple Mail (tr)
    multiline`^>?${HS}*Початок листа, що пересилається\s?:`, // Apple Mail (uk)
    multiline`^${HS}*-{8,10}\s*Forwarded message\s*-{8,10}\s*`, // Gmail (all locales), Missive (en), HubSpot (en)
    multiline`^${HS}*_{32}\s*$`, // Outlook Live / 365 (all locales)
    /^\s?Forwarded message:/m, // Mailmate
    ...OUTLOOK_2019_SEPARATORS_WITH_INFORMATION.map(withoutGroups), // Outlook 2019 (all locales)
    multiline`^${HS}*-{5,8} Přeposlaná zpráva -{5,8}\s*`, // Yahoo Mail (cs), Thunderbird (cs)
    multiline`^${HS}*-{5,8} Videresendt meddelelse -{5,8}\s*`, // Yahoo Mail (da), Thunderbird (da)
    multiline`^${HS}*-{5,10} Weitergeleitete Nachricht -{5,10}\s*`, // Yahoo Mail (de), Thunderbird (de), HubSpot (de)
    multiline`^${HS}*-{5,8} Forwarded Message -{5,8}\s*`, // Yahoo Mail (en), Thunderbird (en)
    multiline`^${HS}*-{5,10} Mensaje reenviado -{5,10}\s*`, // Yahoo Mail (es), Thunderbird (es), HubSpot (es)
    multiline`^${HS}*-{5,10} Edelleenlähetetty viesti -{5,10}\s*`, // Yahoo Mail (fi), HubSpot (fi)
    multiline`^${HS}*-{5} Message transmis -{5}\s*`, // Yahoo Mail (fr)
    multiline`^${HS}*-{5,8} Továbbított üzenet -{5,8}\s*`, // Yahoo Mail (hu), Thunderbird (hu)
    multiline`^${HS}*-{5,10} Messaggio inoltrato -{5,10}\s*`, // Yahoo Mail (it), HubSpot (it)
    multiline`^${HS}*-{5,10} Doorgestuurd bericht -{5,10}\s*`, // Yahoo Mail (nl), Thunderbird (nl), HubSpot (nl)
    multiline`^${HS}*-{5,8} Videresendt melding -{5,8}\s*`, // Yahoo Mail (no), Thunderbird (no)
    multiline`^${HS}*-{5} Przekazana wiadomość -{5}\s*`, // Yahoo Mail (pl)
    multiline`^${HS}*-{5,8} Mensagem reencaminhada -{5,8}\s*`, // Yahoo Mail (pt), Thunderbird (pt)
    multiline`^${HS}*-{5,10} Mensagem encaminhada -{5,10}\s*`, // Yahoo Mail (pt-br), Thunderbird (pt-br), HubSpot (pt-br)
    multiline`^${HS}*-{5,8} Mesaj redirecționat -{5,8}\s*`, // Yahoo Mail (ro)
    multiline`^${HS}*-{5} Пересылаемое сообщение -{5}\s*`, // Yahoo Mail (ru)
    multiline`^${HS}*-{5} Preposlaná správa -{5}\s*`, // Yahoo Mail (sk)
    multiline`^${HS}*-{5,10} Vidarebefordrat meddelande -{5,10}\s*`, // Yahoo Mail (sv), Thunderbird (sv), HubSpot (sv)
    multiline`^${HS}*-{5} İletilmiş Mesaj -{5}\s*`, // Yahoo Mail (tr)
    multiline`^${HS}*-{5} Перенаправлене повідомлення -{5}\s*`, // Yahoo Mail (uk)
    multiline`^${HS}*-{8} Välitetty viesti \/ Fwd.Msg -{8}\s*`, // Thunderbird (fi)
    multiline`^${HS}*-{8,10} Message transféré -{8,10}\s*`, // Thunderbird (fr), HubSpot (fr)
    multiline`^${HS}*-{8} Proslijeđena poruka -{8}\s*`, // Thunderbird (hr)
    multiline`^${HS}*-{8} Messaggio Inoltrato -{8}\s*`, // Thunderbird (it)
    multiline`^${HS}*-{3} Treść przekazanej wiadomości -{3}\s*`, // Thunderbird (pl)
    multiline`^${HS}*-{8} Перенаправленное сообщение -{8}\s*`, // Thunderbird (ru)
    multiline`^${HS}*-{8} Preposlaná správa --- Forwarded Message -{8}\s*`, // Thunderbird (sk)
    multiline`^${HS}*-{8} İletilen İleti -{8}\s*`, // Thunderbird (tr)
    multiline`^${HS}*-{8} Переслане повідомлення -{8}\s*`, // Thunderbird (uk)
    multiline`^${HS}*-{9,10} メッセージを転送 -{9,10}\s*`, // HubSpot (ja)
    multiline`^${HS}*-{9,10} Wiadomość przesłana dalej -{9,10}\s*`, // HubSpot (pl)
    multiline`^>?${HS}*-{10} Original Message -{10}\s*` // IONOS by 1 & 1 (en)
  ],

  separator_with_information: OUTLOOK_2019_SEPARATORS_WITH_INFORMATION,

  original_subject: [
    /^\*?Subject\s?:\*?(.+)/im, // Apple Mail (en), Gmail (all locales), Outlook Live / 365 (all locales), New Outlook 2019 (en), Thunderbird (da, en), Missive (en), HubSpot (en)
    /^Předmět\s?:(.+)/im, // Apple Mail (cs), New Outlook 2019 (cs), Thunderbird (cs)
    /^Emne\s?:(.+)/im, // Apple Mail (da, no), New Outlook 2019 (da), Thunderbird (no)
    /^Betreff\s?:(.+)/im, // Apple Mail (de), New Outlook 2019 (de), Thunderbird (de), HubSpot (de)
    /^Asunto\s?:(.+)/im, // Apple Mail (es), New Outlook 2019 (es), Thunderbird (es), HubSpot (es)
    /^Aihe\s?:(.+)/im, // Apple Mail (fi), New Outlook 2019 (fi), Thunderbird (fi), HubSpot (fi)
    /^Objet\s?:(.+)/im, // Apple Mail (fr), New Outlook 2019 (fr), HubSpot (fr)
    /^Predmet\s?:(.+)/im, // Apple Mail (hr, sk), New Outlook 2019 (sk), Thunderbird (sk)
    /^Tárgy\s?:(.+)/im, // Apple Mail (hu), New Outlook 2019 (hu), Thunderbird (hu)
    /^Oggetto\s?:(.+)/im, // Apple Mail (it), New Outlook 2019 (it), Thunderbird (it), HubSpot (it)
    /^Onderwerp\s?:(.+)/im, // Apple Mail (nl), New Outlook 2019 (nl), Thunderbird (nl), HubSpot (nl)
    /^Temat\s?:(.+)/im, // Apple Mail (pl), New Outlook 2019 (pl), Thunderbird (pl), HubSpot (pl)
    /^Assunto\s?:(.+)/im, // Apple Mail (pt, pt-br), New Outlook 2019 (pt, pt-br), Thunderbird (pt, pt-br), HubSpot (pt-br)
    /^Subiectul\s?:(.+)/im, // Apple Mail (ro), Thunderbird (ro)
    /^Тема\s?:(.+)/im, // Apple Mail (ru, uk), New Outlook 2019 (ru), Thunderbird (ru, uk)
    /^Ämne\s?:(.+)/im, // Apple Mail (sv), New Outlook 2019 (sv), Thunderbird (sv), HubSpot (sv)
    /^Konu\s?:(.+)/im, // Apple Mail (tr), Thunderbird (tr)
    /^Sujet\s?:(.+)/im, // Thunderbird (fr)
    /^Naslov\s?:(.+)/im, // Thunderbird (hr)
    /^件名：(.+)/im // HubSpot (ja)
  ],

  original_subject_lax: [
    /Subject\s?:(.+)/i, // Yahoo Mail (en)
    /Emne\s?:(.+)/i, // Yahoo Mail (da, no)
    /Předmět\s?:(.+)/i, // Yahoo Mail (cs)
    /Betreff\s?:(.+)/i, // Yahoo Mail (de)
    /Asunto\s?:(.+)/i, // Yahoo Mail (es)
    /Aihe\s?:(.+)/i, // Yahoo Mail (fi)
    /Objet\s?:(.+)/i, // Yahoo Mail (fr)
    /Tárgy\s?:(.+)/i, // Yahoo Mail (hu)
    /Oggetto\s?:(.+)/i, // Yahoo Mail (it)
    /Onderwerp\s?:(.+)/i, // Yahoo Mail (nl)
    /Assunto\s?:?(.+)/i, // Yahoo Mail (pt, pt-br)
    /Temat\s?:(.+)/i, // Yahoo Mail (pl)
    /Subiect\s?:(.+)/i, // Yahoo Mail (ro)
    /Тема\s?:(.+)/i, // Yahoo Mail (ru, uk)
    /Predmet\s?:(.+)/i, // Yahoo Mail (sk)
    /Ämne\s?:(.+)/i, // Yahoo Mail (sv)
    /Konu\s?:(.+)/i // Yahoo Mail (tr)
  ],

  original_from: [
    multiline`^(\*?${HS}*From\s?:\*?(.+))$`, // Apple Mail (en), Outlook Live / 365 (all locales), New Outlook 2019 (en), Thunderbird (da, en), Missive (en), HubSpot (en)
    multiline`^(${HS}*Od\s?:(.+))$`, // Apple Mail (cs, pl, sk), Gmail (cs, pl, sk), New Outlook 2019 (cs, pl, sk), Thunderbird (cs, sk), HubSpot (pl)
    multiline`^(${HS}*Fra\s?:(.+))$`, // Apple Mail (da, no), Gmail (da, no), New Outlook 2019 (da), Thunderbird (no)
    multiline`^(${HS}*Von\s?:(.+))$`, // Apple Mail (de), Gmail (de), New Outlook 2019 (de), Thunderbird (de), HubSpot (de)
    multiline`^(${HS}*De\s?:(.+))$`, // Apple Mail (es, fr, pt, pt-br), Gmail (es, fr, pt, pt-br), New Outlook 2019 (es, fr, pt, pt-br), Thunderbird (fr, pt, pt-br), HubSpot (es, fr, pt-br)
    multiline`^(${HS}*Lähettäjä\s?:(.+))$`, // Apple Mail (fi), Gmail (fi), New Outlook 2019 (fi), Thunderbird (fi), HubSpot (fi)
    multiline`^(${HS}*Šalje\s?:(.+))$`, // Apple Mail (hr), Gmail (hr), Thunderbird (hr)
    multiline`^(${HS}*Feladó\s?:(.+))$`, // Apple Mail (hu), Gmail (hu), New Outlook 2019 (fr), Thunderbird (hu)
    multiline`^(${HS}*Da\s?:(.+))$`, // Apple Mail (it), Gmail (it), New Outlook 2019 (it), HubSpot (it)
    multiline`^(${HS}*Van\s?:(.+))$`, // Apple Mail (nl), Gmail (nl), New Outlook 2019 (nl), Thunderbird (nl), HubSpot (nl)
    multiline`^(${HS}*Expeditorul\s?:(.+))$`, // Apple Mail (ro)
    multiline`^(${HS}*Отправитель\s?:(.+))$`, // Apple Mail (ru)
    multiline`^(${HS}*Från\s?:(.+))$`, // Apple Mail (sv), Gmail (sv), New Outlook 2019 (sv), Thunderbird (sv), HubSpot (sv)
    multiline`^(${HS}*Kimden\s?:(.+))$`, // Apple Mail (tr), Thunderbird (tr)
    multiline`^(${HS}*Від кого\s?:(.+))$`, // Apple Mail (uk)
    multiline`^(${HS}*Saatja\s?:(.+))$`, // Gmail (et)
    multiline`^(${HS}*De la\s?:(.+))$`, // Gmail (ro)
    multiline`^(${HS}*Gönderen\s?:(.+))$`, // Gmail (tr)
    multiline`^(${HS}*От\s?:(.+))$`, // Gmail (ru), New Outlook 2019 (ru), Thunderbird (ru)
    multiline`^(${HS}*Від\s?:(.+))$`, // Gmail (uk), Thunderbird (uk)
    multiline`^(${HS}*Mittente\s?:(.+))$`, // Thunderbird (it)
    multiline`^(${HS}*Nadawca\s?:(.+))$`, // Thunderbird (pl)
    multiline`^(${HS}*de la\s?:(.+))$`, // Thunderbird (ro)
    multiline`^(${HS}*送信元：(.+))$` // HubSpot (ja)
  ],

  original_from_lax: [
    laxFromHeader("From"), // Yahoo Mail (en)
    laxFromHeader("Od"), // Yahoo Mail (cs, pl, sk)
    laxFromHeader("Fra"), // Yahoo Mail (da, no)
    laxFromHeader("Von"), // Yahoo Mail (de)
    laxFromHeader("De"), // Yahoo Mail (es, fr, pt, pt-br)
    laxFromHeader("Lähettäjä"), // Yahoo Mail (fi)
    laxFromHeader("Feladó"), // Yahoo Mail (hu)
    laxFromHeader("Da"), // Yahoo Mail (it)
    laxFromHeader("Van"), // Yahoo Mail (nl)
    laxFromHeader("De la"), // Yahoo Mail (ro)
    laxFromHeader("От"), // Yahoo Mail (ru)
    laxFromHeader("Från"), // Yahoo Mail (sv)
    laxFromHeader("Kimden"), // Yahoo Mail (tr)
    laxFromHeader("Від") // Yahoo Mail (uk)
  ],

  original_to: [
    multiline`^\*?${HS}*To\s?:\*?(.+)$`, // Apple Mail (en), Gmail (all locales), Outlook Live / 365 (all locales), Thunderbird (da, en), Missive (en), HubSpot (en)
    multiline`^${HS}*Komu\s?:(.+)$`, // Apple Mail (cs), New Outlook 2019 (cs, sk), Thunderbird (cs)
    multiline`^${HS}*Til\s?:(.+)$`, // Apple Mail (da, no), New Outlook 2019 (da), Thunderbird (no)
    multiline`^${HS}*An\s?:(.+)$`, // Apple Mail (de), New Outlook 2019 (de), Thunderbird (de), HubSpot (de)
    multiline`^${HS}*Para\s?:(.+)$`, // Apple Mail (es, pt, pt-br), New Outlook 2019 (es, pt, pt-br), Thunderbird (es, pt, pt-br), HubSpot (pt-br)
    multiline`^${HS}*Vastaanottaja\s?:(.+)$`, // Apple Mail (fi), New Outlook 2019 (fi), Thunderbird (fi), HubSpot (fi)
    multiline`^${HS}*À\s?:(.+)$`, // Apple Mail (fr), New Outlook 2019 (fr), HubSpot (fr)
    multiline`^${HS}*Prima\s?:(.+)$`, // Apple Mail (hr), Thunderbird (hr)
    multiline`^${HS}*Címzett\s?:(.+)$`, // Apple Mail (hu), New Outlook 2019 (hu), Thunderbird (hu)
    multiline`^${HS}*A\s?:(.+)$`, // Apple Mail (it), New Outlook 2019 (it), Thunderbird (it), HubSpot (es, it)
    multiline`^${HS}*Aan\s?:(.+)$`, // Apple Mail (nl), New Outlook 2019 (nl), Thunderbird (nl), HubSpot (nl)
    multiline`^${HS}*Do\s?:(.+)$`, // Apple Mail (pl), New Outlook 2019 (pl), HubSpot (pl)
    multiline`^${HS}*Destinatarul\s?:(.+)$`, // Apple Mail (ro)
    multiline`^${HS}*Кому\s?:(.+)$`, // Apple Mail (ru, uk), New Outlook 2019 (ru), Thunderbird (ru, uk)
    multiline`^${HS}*Pre\s?:(.+)$`, // Apple Mail (sk), Thunderbird (sk)
    multiline`^${HS}*Till\s?:(.+)$`, // Apple Mail (sv), New Outlook 2019 (sv), Thunderbird (sv)
    multiline`^${HS}*Kime\s?:(.+)$`, // Apple Mail (tr), Thunderbird (tr)
    multiline`^${HS}*Pour\s?:(.+)$`, // Thunderbird (fr)
    multiline`^${HS}*Adresat\s?:(.+)$`, // Thunderbird (pl)
    multiline`^${HS}*送信先：(.+)$` // HubSpot (ja)
  ],

  original_to_lax: [
    /(?<!\s)\s*To\s?:(.+)$/m, // Yahook Mail (en)
    /(?<!\s)\s*Komu\s?:(.+)$/m, // Yahook Mail (cs, sk)
    /(?<!\s)\s*Til\s?:(.+)$/m, // Yahook Mail (da, no, sv)
    /(?<!\s)\s*An\s?:(.+)$/m, // Yahook Mail (de)
    /(?<!\s)\s*Para\s?:(.+)$/m, // Yahook Mail (es, pt, pt-br)
    /(?<!\s)\s*Vastaanottaja\s?:(.+)$/m, // Yahook Mail (fi)
    /(?<!\s)\s*À\s?:(.+)$/m, // Yahook Mail (fr)
    /(?<!\s)\s*Címzett\s?:(.+)$/m, // Yahook Mail (hu)
    /(?<!\s)\s*A\s?:(.+)$/m, // Yahook Mail (it)
    /(?<!\s)\s*Aan\s?:(.+)$/m, // Yahook Mail (nl)
    /(?<!\s)\s*Do\s?:(.+)$/m, // Yahook Mail (pl)
    /(?<!\s)\s*Către\s?:(.+)$/m, // Yahook Mail (ro), Thunderbird (ro)
    /(?<!\s)\s*Кому\s?:(.+)$/m, // Yahook Mail (ru, uk)
    /(?<!\s)\s*Till\s?:(.+)$/m, // Yahook Mail (sv)
    /(?<!\s)\s*Kime\s?:(.+)$/m // Yahook Mail (tr)
  ],

  original_reply_to: [
    multiline`^${HS}*Reply-To\s?:(.+)$`, // Apple Mail (en)
    multiline`^${HS}*Odgovori na\s?:(.+)$`, // Apple Mail (hr)
    multiline`^${HS}*Odpověď na\s?:(.+)$`, // Apple Mail (cs)
    multiline`^${HS}*Svar til\s?:(.+)$`, // Apple Mail (da)
    multiline`^${HS}*Antwoord aan\s?:(.+)$`, // Apple Mail (nl)
    multiline`^${HS}*Vastaus\s?:(.+)$`, // Apple Mail (fi)
    multiline`^${HS}*Répondre à\s?:(.+)$`, // Apple Mail (fr)
    multiline`^${HS}*Antwort an\s?:(.+)$`, // Apple Mail (de)
    multiline`^${HS}*Válaszcím\s?:(.+)$`, // Apple Mail (hu)
    multiline`^${HS}*Rispondi a\s?:(.+)$`, // Apple Mail (it)
    multiline`^${HS}*Svar til\s?:(.+)$`, // Apple Mail (no)
    multiline`^${HS}*Odpowiedź-do\s?:(.+)$`, // Apple Mail (pl)
    multiline`^${HS}*Responder A\s?:(.+)$`, // Apple Mail (pt)
    multiline`^${HS}*Responder a\s?:(.+)$`, // Apple Mail (pt-br, es)
    multiline`^${HS}*Răspuns către\s?:(.+)$`, // Apple Mail (ro)
    multiline`^${HS}*Ответ-Кому\s?:(.+)$`, // Apple Mail (ru)
    multiline`^${HS}*Odpovedať-Pre\s?:(.+)$`, // Apple Mail (sk)
    multiline`^${HS}*Svara till\s?:(.+)$`, // Apple Mail (sv)
    multiline`^${HS}*Yanıt Adresi\s?:(.+)$`, // Apple Mail (tr)
    multiline`^${HS}*Кому відповісти\s?:(.+)$` // Apple Mail (uk)
  ],

  original_cc: [
    multiline`^\*?${HS}*Cc\s?:\*?(.+)$`, // Apple Mail (en, da, es, fr, hr, it, pt, pt-br, ro, sk), Gmail (all locales), Outlook Live / 365 (all locales), New Outlook 2019 (da, de, en, fr, it, pt-br), Missive (en), HubSpot (de, en, es, it, nl, pt-br)
    multiline`^${HS}*CC\s?:(.+)$`, // New Outlook 2019 (es, nl, pt), Thunderbird (da, en, es, fi, hr, hu, it, nl, no, pt, pt-br, ro, tr, uk)
    multiline`^${HS}*Kopie\s?:(.+)$`, // Apple Mail (cs, de, nl), New Outlook 2019 (cs), Thunderbird (cs)
    multiline`^${HS}*Kopio\s?:(.+)$`, // Apple Mail (fi), New Outlook 2019 (fi), HubSpot (fi)
    multiline`^${HS}*Másolat\s?:(.+)$`, // Apple Mail (hu)
    multiline`^${HS}*Kopi\s?:(.+)$`, // Apple Mail (no)
    multiline`^${HS}*Dw\s?:(.+)$`, // Apple Mail (pl)
    multiline`^${HS}*Копия\s?:(.+)$`, // Apple Mail (ru), New Outlook 2019 (ru), Thunderbird (ru)
    multiline`^${HS}*Kopia\s?:(.+)$`, // Apple Mail (sv), New Outlook 2019 (sv), Thunderbird (pl, sv), HubSpot (sv)
    multiline`^${HS}*Bilgi\s?:(.+)$`, // Apple Mail (tr)
    multiline`^${HS}*Копія\s?:(.+)$`, // Apple Mail (uk),
    multiline`^${HS}*Másolatot kap\s?:(.+)$`, // New Outlook 2019 (hu)
    multiline`^${HS}*Kópia\s?:(.+)$`, // New Outlook 2019 (sk), Thunderbird (sk)
    multiline`^${HS}*DW\s?:(.+)$`, // New Outlook 2019 (pl), HubSpot (pl)
    multiline`^${HS}*Kopie \(CC\)\s?:(.+)$`, // Thunderbird (de)
    multiline`^${HS}*Copie à\s?:(.+)$`, // Thunderbird (fr)
    multiline`^${HS}*CC：(.+)$` // HubSpot (ja)
  ],

  original_cc_lax: [
    /(?<!\s)\s*Cc\s?:(.+)$/m, // Yahoo Mail (da, en, it, nl, pt, pt-br, ro, tr)
    /(?<!\s)\s*CC\s?:(.+)$/m, // Yahoo Mail (de, es)
    /(?<!\s)\s*Kopie\s?:(.+)$/m, // Yahoo Mail (cs)
    /(?<!\s)\s*Kopio\s?:(.+)$/m, // Yahoo Mail (fi)
    /(?<!\s)\s*Másolat\s?:(.+)$/m, // Yahoo Mail (hu)
    /(?<!\s)\s*Kopi\s?:(.+)$/m, // Yahoo Mail (no)
    /(?<!\s)\s*Dw\s?(.+)$/m, // Yahoo Mail (pl)
    /(?<!\s)\s*Копия\s?:(.+)$/m, // Yahoo Mail (ru)
    /(?<!\s)\s*Kópia\s?:(.+)$/m, // Yahoo Mail (sk)
    /(?<!\s)\s*Kopia\s?:(.+)$/m, // Yahoo Mail (sv)
    /(?<!\s)\s*Копія\s?:(.+)$/m // Yahoo Mail (uk)
  ],

  original_date: [
    multiline`^${HS}*Date\s?:(.+)$`, // Apple Mail (en, fr), Gmail (all locales), New Outlook 2019 (en, fr), Thunderbird (da, en, fr), Missive (en), HubSpot (en, fr)
    multiline`^${HS}*Datum\s?:(.+)$`, // Apple Mail (cs, de, hr, nl, sv), New Outlook 2019 (cs, de, nl, sv), Thunderbird (cs, de, hr, nl, sv), HubSpot (de, nl, sv)
    multiline`^${HS}*Dato\s?:(.+)$`, // Apple Mail (da, no), New Outlook 2019 (da), Thunderbird (no)
    multiline`^${HS}*Envoyé\s?:(.+)$`, // New Outlook 2019 (fr)
    multiline`^${HS}*Fecha\s?:(.+)$`, // Apple Mail (es), New Outlook 2019 (es), Thunderbird (es), HubSpot (es)
    multiline`^${HS}*Päivämäärä\s?:(.+)$`, // Apple Mail (fi), New Outlook 2019 (fi), HubSpot (fi)
    multiline`^${HS}*Dátum\s?:(.+)$`, // Apple Mail (hu, sk), New Outlook 2019 (sk), Thunderbird (hu, sk)
    multiline`^${HS}*Data\s?:(.+)$`, // Apple Mail (it, pl, pt, pt-br), New Outlook 2019 (it, pl, pt, pt-br), Thunderbird (it, pl, pt, pt-br), HubSpot (it, pl, pt-br)
    multiline`^${HS}*Dată\s?:(.+)$`, // Apple Mail (ro), Thunderbird (ro)
    multiline`^${HS}*Дата\s?:(.+)$`, // Apple Mail (ru, uk), New Outlook 2019 (ru), Thunderbird (ru, uk)
    multiline`^${HS}*Tarih\s?:(.+)$`, // Apple Mail (tr), Thunderbird (tr)
    multiline`^\*?${HS}*Sent\s?:\*?(.+)$`, // Outlook Live / 365 (all locales)
    multiline`^${HS}*Päiväys\s?:(.+)$`, // Thunderbird (fi)
    multiline`^${HS}*日付：(.+)$` // HubSpot (ja)
  ],

  original_date_lax: [
    /(?<!\s)\s*Datum\s?:(.+)$/m, // Yahoo Mail (cs)
    /(?<!\s)\s*Sendt\s?:(.+)$/m, // Yahoo Mail (da, no)
    /(?<!\s)\s*Gesendet\s?:(.+)$/m, // Yahoo Mail (de)
    /(?<!\s)\s*Sent\s?:(.+)$/m, // Yahoo Mail (en)
    /(?<!\s)\s*Enviado\s?:(.+)$/m, // Yahoo Mail (es, pt, pt-br)
    /(?<!\s)\s*Envoyé\s?:(.+)$/m, // Yahoo Mail (fr)
    /(?<!\s)\s*Lähetetty\s?:(.+)$/m, // Yahoo Mail (fi)
    /(?<!\s)\s*Elküldve\s?:(.+)$/m, // Yahoo Mail (hu)
    /(?<!\s)\s*Inviato\s?:(.+)$/m, // Yahoo Mail (it)
    /(?<!\s)\s*Verzonden\s?:(.+)$/m, // Yahoo Mail (it)
    /(?<!\s)\s*Wysłano\s?:(.+)$/m, // Yahoo Mail (pl)
    /(?<!\s)\s*Trimis\s?:(.+)$/m, // Yahoo Mail (ro)
    /(?<!\s)\s*Отправлено\s?:(.+)$/m, // Yahoo Mail (ru)
    /(?<!\s)\s*Odoslané\s?:(.+)$/m, // Yahoo Mail (sk)
    /(?<!\s)\s*Skickat\s?:(.+)$/m, // Yahoo Mail (sv)
    /(?<!\s)\s*Gönderilen\s?:(.+)$/m, // Yahoo Mail (tr)
    /(?<!\s)\s*Відправлено\s?:(.+)$/m // Yahoo Mail (uk)
  ],

  mailbox: [
    regex()`^\s*<.${upTo("<mailto:")}<mailto:(.${upTo(">>")})>>`, // "<walter.sheltan@acme.com<mailto:walter.sheltan@acme.com>>"
    regex()`^(.${lazyWords("[^\\s<]")})\s*<.${upTo("<mailto:")}<mailto:(.${upTo(">>")})>>`, // "Walter Sheltan <walter.sheltan@acme.com<mailto:walter.sheltan@acme.com>>"
    regex()`^(.${lazyWords(`(?!${OPEN}mailto:)\\S`)})\s*${OPEN}mailto:(.${upTo(CLOSE)})${CLOSE}`, // "Walter Sheltan <mailto:walter.sheltan@acme.com>" or "Walter Sheltan [mailto:walter.sheltan@acme.com]" or "walter.sheltan@acme.com <mailto:walter.sheltan@acme.com>"
    regex()`^'(${upTo(`'\\s*${OPEN}`, "+")})'\s*${OPEN}(.${upTo(CLOSE)})${CLOSE}`, // "'Walter Sheltan' <walter.sheltan@acme.com>" or "'Walter Sheltan' [walter.sheltan@acme.com]" or "'walter.sheltan@acme.com' <walter.sheltan@acme.com>"
    regex()`^"'(${upTo(`'"\\s*${OPEN}`, "+")})'"\s*${OPEN}(.${upTo(CLOSE)})${CLOSE}`, // ""'Walter Sheltan'" <walter.sheltan@acme.com>" or ""'Walter Sheltan'" [walter.sheltan@acme.com]" or ""'walter.sheltan@acme.com'" <walter.sheltan@acme.com>"
    regex()`^"(${upTo(`"\\s*${OPEN}`, "+")})"\s*${OPEN}(.${upTo(CLOSE)})${CLOSE}`, // ""Walter Sheltan" <walter.sheltan@acme.com>" or ""Walter Sheltan" [walter.sheltan@acme.com]" or ""walter.sheltan@acme.com" <walter.sheltan@acme.com>"
    regex()`^([^,;]${lazyWords("[^,;\\s\\[|<]", "\\s")})\s*${OPEN}(.${upTo(CLOSE)})${CLOSE}`, // "Walter Sheltan <walter.sheltan@acme.com>" or "Walter Sheltan [walter.sheltan@acme.com]" or "walter.sheltan@acme.com <walter.sheltan@acme.com>"
    /^(.?)\s?\n?\s*[\[|<](.+?)[\]|>]/, // "<walter.sheltan@acme.com>"
    /^([^\s@]+@[^\s@]+\.[^\s@,]+)/, // "walter.sheltan@acme.com"
    regex()`^([^;].${lazyWords("[^\\s\\[|<]")})\s*${OPEN}(.${upTo(CLOSE)})${CLOSE}` // "Walter, Sheltan <walter.sheltan@acme.com>" or "Walter, Sheltan [walter.sheltan@acme.com]"
  ],

  mailbox_address: [
    /^(?=[^\s@]+@[^\s@]+$)(([^\s@]+)@([^\s@]+)\.([^\s@]+))$/
  ]
};
/* eslint-enable max-len */

/**************************************************************************
 * TYPES
 ***************************************************************************/

interface Regexes {
  quote_line_break: RegExp;
  quote: RegExp;
  four_spaces: RegExp;
  carriage_return: RegExp;
  byte_order_mark: RegExp;
  trailing_non_breaking_space: RegExp;
  non_breaking_space: RegExp;

  subject: RegExp[];
  separator: RegExp[];
  separator_line: RegExp[];
  separator_with_information: RegExp[];
  original_subject: RegExp[];
  original_subject_line: RegExp[];
  original_subject_lax: RegExp[];
  original_subject_lax_line: RegExp[];
  original_from: RegExp[];
  original_from_lax: RegExp[];
  original_to: RegExp[];
  original_to_line: RegExp[];
  original_to_lax: RegExp[];
  original_reply_to: RegExp[];
  original_reply_to_line: RegExp[];
  original_cc: RegExp[];
  original_cc_line: RegExp[];
  original_cc_lax: RegExp[];
  original_date: RegExp[];
  original_date_line: RegExp[];
  original_date_lax: RegExp[];
  mailbox: RegExp[];
  mailbox_address: RegExp[];
}

interface Mailbox {
  address: string | null;
  name: string | null;
}

/**************************************************************************
 * PARSER
 ***************************************************************************/

/**
 * Parser
 */
class Parser {
  private regexes: Regexes;

  /**
   * Constructor
   */
  constructor() {
    this.regexes = {} as Regexes;

    this.initRegexes();
  }

  /**
   * Parses the subject part of the email
   */
  parseSubject(subject: string) {
    const match = loopRegexes(this.regexes.subject, subject);

    if (match?.length > 1) {
      // Notice: return an empty string if the detected subject is empty \
      //   (e.g. 'Fwd: ')
      return trimString(match[1]) || "";
    }

    return null;
  }

  /**
   * Parses the body part of the email
   */
  parseBody(body: string, forwarded: boolean = false) {
    // Replace carriage return by regular line break
    let cleanBody = body.replace(this.regexes.carriage_return, "\n");

    // Remove Byte Order Mark
    cleanBody = cleanBody.replace(this.regexes.byte_order_mark, "");

    // Remove trailing Non-breaking space
    cleanBody = cleanBody.replace(this.regexes.trailing_non_breaking_space, "");

    // Replace Non-breaking space with regular space
    cleanBody = cleanBody.replace(this.regexes.non_breaking_space, " ");

    // First method: split via the separator (Apple Mail, Gmail, \
    //   Outlook Live / 365, Outlook 2019, Yahoo Mail, Thunderbird)
    // Notice: use 'line' regex that will capture the line itself, as we may \
    //   need it to build the original email back (in case of nested emails)
    let match = loopRegexes(this.regexes.separator_line, cleanBody, "split");

    if (match?.length > 2) {
      // The `split` operation creates a match with 3 substrings:
      //  * 0: anything before the line with the separator (i.e. the message)
      //  * 1: the line with the separator
      // * 2: anything after the line with the separator (i.e. the body of \
      //   the original email)
      // Notice: in case of nested emails, there may be several matches \
      //   against 'separator_line'. In that case, the `split` operation \
      //   creates a match with (n x 3) substrings. We need to reconciliate \
      //   those substrings.
      const email = reconciliateSplitMatch(
        match,

        3,

        // By default, attach anything after the line with the separator
        [2]
      );

      return {
        body: cleanBody,

        message: trimString(match[0]),
        email: trimString(email)
      };
    }

    // Attempt second method?
    // Notice: as this second method is more uncertain (we split via the From \
    //   part, without further verification), we have to be sure we can \
    //   attempt it. The `forwarded` boolean gives the confirmation that the \
    //   email was indeed forwarded (detected from the Subject part)
    if (forwarded === true) {
      // Second method: split via the From part (New Outlook 2019, \
      //   Outlook Live / 365)
      match = loopRegexes(this.regexes.original_from, cleanBody, "split");

      if (match?.length > 3) {
        // The `split` operation creates a match with 4 substrings:
        // 0: anything before the line with the From part (i.e. the \
        //   message before the original email)
        // 1: the line with the From part (in the original email)
        // 2: the From part itself
        // 3: anything after the line with the From part (i.e. \
        //   the rest of the original email)
        // Notice: in case of nested emails, there may be several matches \
        //   against 'original_from'. In that case, the `split` operation \
        //   creates a match with (n x 4) substrings. We need to reconciliate \
        //   those substrings.
        const email = reconciliateSplitMatch(
          match,

          4,

          // By default, attach the line that contains the From part back to \
          //   the rest of the original email (exclude the From part itself)
          [1, 3],

          // When reconciliating other substrings, we want to exclude the From \
          //   part itself
          (index) => {
            return (index % 3 === 2);
          }
        );

        return {
          body: cleanBody,

          message: trimString(match[0]),
          email: trimString(email)
        };
      }
    }

    return {};
  }

  /**
   * Parses the original forwarded email
   */
  parseOriginalEmail(text: string, body: string) {
    // Remove Byte Order Mark
    let cleanText = text.replace(this.regexes.byte_order_mark, "");

    // Remove ">" at the beginning of each line, while keeping line breaks
    cleanText = cleanText.replace(this.regexes.quote_line_break, "");

    // Remove ">" at the beginning of other lines
    cleanText = cleanText.replace(this.regexes.quote, "");

    // Remove "    " at the beginning of lines
    cleanText = cleanText.replace(this.regexes.four_spaces, "");

    return {
      body: this.parseOriginalBody(cleanText),

      from: this.parseOriginalFrom(cleanText, body),
      to: this.parseOriginalTo(cleanText),
      cc: this.parseOriginalCc(cleanText),

      subject: this.parseOriginalSubject(cleanText),
      date: this.parseOriginalDate(cleanText, body)
    };
  }

  /**
   * Initializes regexes
   */
  private initRegexes() {
    const regexesMap = this.regexes as unknown as Record<string, RegExp | RegExp[]>;

    for (const key in REGEXES) {
      const keyLine = `${key}_line`;
      const entry   = REGEXES[key];

      if (Array.isArray(entry)) {
        const built     = [] as RegExp[];
        const builtLine = [] as RegExp[];

        for (let i = 0; i < entry.length; i++) {
          const regex = entry[i];

          // Build 'line' alternative?
          if (LINE_REGEXES.includes(key)) {
            const regexLine = this.buildLineRegex(regex);

            builtLine.push(regexLine);
          }

          built.push(
            new RegExp(regex)
          );
        }

        regexesMap[key] = built;

        if (LINE_REGEXES.includes(key)) {
          regexesMap[keyLine] = builtLine;
        }
      } else {
        const single = entry;

        // Build 'line' alternative?
        if (LINE_REGEXES.includes(key)) {
          regexesMap[keyLine] = this.buildLineRegex(single);
        }

        regexesMap[key] = new RegExp(single);
      }
    }
  }

  /**
   * Builds 'line' alternative regex
   */
  private buildLineRegex(regex: RegExp) {
    // A 'line' regex will capture not only inner groups, but also the line \
    //   itself
    return new RegExp(`(${regex.source})`, regex.flags);
  }

  /**
   * Parses the body part
   */
  private parseOriginalBody(text: string) {
    let match = null;

    // First method: extract the text after the Subject part \
    //   (Outlook Live / 365) or after the Cc, To or Reply-To part \
    //   (Apple Mail, Gmail) or Date part (MailMate). A new line must be \
    //   present.
    // Notice: use 'line' regexes that will capture not only the Subject, Cc, \
    //   To or Reply-To part, but also the line itself, as we may need it \
    //   to build the original body back (in case of nested emails)
    const lineRegexes = [
      this.regexes.original_subject_line,
      this.regexes.original_cc_line,
      this.regexes.original_to_line,
      this.regexes.original_reply_to_line,
      this.regexes.original_date_line
    ];

    for (let i = 0; i < lineRegexes.length; i++) {
      match = loopRegexes(lineRegexes[i], text, "split");

      // A new line must be present between the Cc, To, Reply-To or Subject \
      //   part and the actual body
      if (match?.length > 2 && match[3]?.startsWith("\n\n")) {
        // The `split` operation creates a match with 4 substrings:
        // * 0: anything before the line with the Subject, Cc, To or Reply-To \
        //   part
        //  * 1: the line with the Subject, Cc, To or Reply-To part
        //  * 2: the Subject, Cc, To or Reply-To part itself
        // * 3: anything after the line with the Subject, Cc, To or Reply-To \
        //   part (i.e. the body of the original email)
        // Notice: in case of nested emails, there may be several matches \
        //   against 'original_subject_line', 'original_cc_line', \
        //   'original_to_line' or 'original_reply_to_line'. In that case, the \
        //   `split` operation creates a match with (n x 4) substrings. We \
        //   need to reconciliate those substrings.
        const body = reconciliateSplitMatch(
          match,

          4,

          // By default, attach anything after the line with the Subject, Cc, \
          //   To or Reply-To part
          [3],

          // When reconciliating other substrings, we want to exclude the \
          //   Subject, Cc, To or Reply-To part itself
          (index) => {
            return (index % 3 === 2);
          }
        );

        return trimString(body);
      }
    }

    // Second method: extract the text after the Subject part \
    //   (New Outlook 2019, Yahoo Mail). No new line must be present.
    // Notice: use 'line' regexes that will capture not only the Subject part, \
    //   but also the line itself, as we may need it to build the original \
    //   body back (in case of nested emails)
    match = loopRegexes(
      [].concat(
        this.regexes.original_subject_line,
        this.regexes.original_subject_lax_line
      ),

      text,
      "split"
    );

    // Do not bother checking for new line between the Subject part and the \
    //   actual body (specificity of New Outlook 2019 and Yahoo Mail)
    if (match?.length > 3) {
      // The `split` operation creates a match with 4 substrings:
      // 0: anything before the line with the Subject part
      // 1: the line with the Subject part (in the original email)
      // 2: the Subject part itself
      // 3: anything after the line with the Subject part (i.e. the body of \
      //   the original email)
      // Notice: in case of nested emails, there may be several matches \
      //   against 'original_subject_line' and 'original_subject_lax_line'. In \
      //   that case, the `split` operation creates a match with (n x 4) \
      //   substrings. We need to reconciliate those substrings.
      const body = reconciliateSplitMatch(
        match,

        4,

        // By default, attach anything after the line with the Subject part
        [3],

        // When reconciliating other substrings, we want to exclude the \
        //   Subject part itself
        (index) => {
          return (index % 3 === 2);
        }
      );

      return trimString(body);
    }

    // Third method: return the raw text, as there is no original information \
    //   embbeded (no Cc, To, Subject, etc.) (Outlook 2019)
    return text;
  }

  /**
   * Parses the author (From)
   */
  private parseOriginalFrom(text: string, body: string) {
    let address = null;
    let name = null;

    // First method: extract the author via the From part (Apple Mail, Gmail, \
    //   Outlook Live / 365, New Outlook 2019, Thunderbird)
    const author = this.parseMailbox(this.regexes.original_from, text);

    // Author found?
    if (!Array.isArray(author) && (author?.address || author?.name)) {
      return author;
    }

    // Multiple authors found?
    if (Array.isArray(author) && (author[0]?.address || author[0]?.name)) {
      return author[0];
    }

    // Second method: extract the author via the separator (Outlook 2019)
    let match = loopRegexes(this.regexes.separator_with_information, body);

    if (match?.length === 4 && match.groups) {
      // Notice: the order of parts may change depending on the localization, \
      //   hence the use of named groups
      address = match.groups.from_address;
      name = match.groups.from_name;

      return this.prepareMailbox(
        address,
        name
      );
    }

    // Third method: extract the author via the From part, using lax regexes \
    //   (Yahoo Mail)
    match = loopRegexes(this.regexes.original_from_lax, text);

    if (match?.length > 1) {
      address = match[3];
      name = match[2];

      return this.prepareMailbox(
        address,
        name
      );
    }

    return this.prepareMailbox(
      address,
      name
    );
  }

  /**
   * Parses the primary recipient(s) (To)
   */
  private parseOriginalTo(text: string) {
    // First method: extract the primary recipient(s) via the To part \
    //   (Apple Mail, Gmail, Outlook Live / 365, New Outlook 2019, Thunderbird)
    const recipients = this.parseMailbox(
      this.regexes.original_to,

      text,
      true
    );

    // Recipient(s) found?
    if (Array.isArray(recipients) && recipients.length > 0) {
      return recipients;
    }

    // Second method: the Subject, Date and Cc parts are stuck to the To part, \
    //   remove them before attempting a new extract, using lax regexes \
    //   (Yahoo Mail)
    let cleanText = loopRegexes(
      this.regexes.original_subject_lax,
      text,

      "replace"
    );

    cleanText = loopRegexes(
      this.regexes.original_date_lax,
      cleanText,

      "replace"
    );

    cleanText = loopRegexes(
      this.regexes.original_cc_lax,
      cleanText,

      "replace"
    );

    return this.parseMailbox(
      this.regexes.original_to_lax,

      cleanText,
      true
    );
  }

  /**
   * Parses the carbon-copy recipient(s) (Cc)
   */
  private parseOriginalCc(text: string) {
    // First method: extract the carbon-copy recipient(s) via the Cc part \
    //   (Apple Mail, Gmail, Outlook Live / 365, New Outlook 2019, Thunderbird)
    const recipients = this.parseMailbox(
      this.regexes.original_cc,

      text,
      true
    );

    // Recipient(s) found?
    if (Array.isArray(recipients) && recipients.length > 0) {
      return recipients;
    }

    // Second method: the Subject and Date parts are stuck to the To part, \
    //   remove them before attempting a new extract, using lax regexes \
    //   (Yahoo Mail)
    let cleanText = loopRegexes(
      this.regexes.original_subject_lax,
      text,

      "replace"
    );

    cleanText = loopRegexes(
      this.regexes.original_date_lax,
      cleanText,

      "replace"
    );

    return this.parseMailbox(
      this.regexes.original_cc_lax,

      cleanText,
      true
    );
  }

  /**
   * Parses mailboxes(s)
   */
  private parseMailbox(
    regexes: RegExp[],
    text: string,
    forceArray: boolean = false
  ): Mailbox | Mailbox[] | null {
    const match = loopRegexes(regexes, text);

    if (match?.length > 0) {
      let mailboxesLine = trimString(match[match.length - 1]);

      if (mailboxesLine) {
        const mailboxes: Mailbox[] = [];

        while (mailboxesLine) {
          const mailboxMatch = loopRegexes(
            this.regexes.mailbox,
            mailboxesLine
          );

          // Address and / or name available?
          if (mailboxMatch?.length > 0) {
            let address = null;
            let name = null;

            // Address and name available?
            if (mailboxMatch.length === 3) {
              address = mailboxMatch[2];
              name = mailboxMatch[1];
            } else {
              address = mailboxMatch[1];
            }

            mailboxes.push(
              this.prepareMailbox(
                address,
                name
              )
            );

            // Remove matched mailbox from mailboxes line
            mailboxesLine = trimString(
              mailboxesLine.replace(mailboxMatch[0], "")
            );

            if (mailboxesLine) {
              // Remove leading mailboxes separator \
              //   (", Nicholas <nicholas@globex.corp>")
              for (let i = 0; i < MAILBOXES_SEPARATORS.length; i++) {
                const separator = MAILBOXES_SEPARATORS[i];

                if (mailboxesLine[0] === separator) {
                  mailboxesLine = trimString(mailboxesLine.substring(1));

                  break;
                }
              }
            }
          } else {
            mailboxes.push(
              this.prepareMailbox(
                mailboxesLine,
                null
              )
            );

            // No more matches
            mailboxesLine = "";
          }
        }

        // Return multiple mailboxes
        if (mailboxes.length > 1) {
          return mailboxes;
        }

        // Return single mailbox
        return (forceArray === true) ? mailboxes : mailboxes[0];
      }
    }

    // No mailbox found
    return (forceArray === true) ? [] : null;
  }

  /**
   * Parses the subject part
   */
  private parseOriginalSubject(text: string) {
    // First method: extract the subject via the Subject part (Apple Mail, \
    //   Gmail, Outlook Live / 365, New Outlook 2019, Thunderbird)
    let match = loopRegexes(this.regexes.original_subject, text);

    if (match?.length > 0) {
      return trimString(match[1]);
    }

    // Second method: extract the subject via the Subject part, using lax \
    //   regexes (Yahoo Mail)
    match = loopRegexes(this.regexes.original_subject_lax, text);

    if (match?.length > 0) {
      return trimString(match[1]);
    }

    return null;
  }

  /**
   * Parses the date part
   */
  private parseOriginalDate(text: string, body: string) {
    // First method: extract the date via the Date part (Apple Mail, Gmail, \
    //   Outlook Live / 365, New Outlook 2019, Thunderbird)
    let match = loopRegexes(this.regexes.original_date, text);

    if (match?.length > 0) {
      return trimString(match[1]);
    }

    // Second method: extract the date via the separator (Outlook 2019)
    match = loopRegexes(this.regexes.separator_with_information, body);

    if (match?.length === 4 && match.groups) {
      // Notice: the order of parts may change depending on the localization, \
      //   hence the use of named groups
      return trimString(match.groups.date);
    }

    // Third method: the Subject part is stuck to the Date part, remove it \
    //   before attempting a new extract, using lax regexes (Yahoo Mail)
    const cleanText = loopRegexes(
      this.regexes.original_subject_lax,
      text,

      "replace"
    );

    match = loopRegexes(this.regexes.original_date_lax, cleanText);

    if (match?.length > 0) {
      return trimString(match[1]);
    }

    return null;
  }

  /**
   * Prepares mailbox
   */
  private prepareMailbox(address: string, name: string): Mailbox {
    let trimmedAddress = trimString(address);
    let trimmedName = trimString(name);

    // Make sure mailbox address is valid
    const mailboxAddressMatch = loopRegexes(
      this.regexes.mailbox_address,
      trimmedAddress
    );

    // Invalid mailbox address? Some clients only include the name
    if ((mailboxAddressMatch || []).length === 0) {
      trimmedName = trimmedAddress;
      trimmedAddress = null;
    }

    trimmedAddress = trimmedAddress || null;
    trimmedName = trimmedName || null;

    return {
      address: trimmedAddress,

      // Some clients fill the name with the address \
      //   ("bessie.berry@acme.com <bessie.berry@acme.com>")
      name: (trimmedAddress !== trimmedName) ? trimmedName : null
    };
  }
}

export default Parser;
