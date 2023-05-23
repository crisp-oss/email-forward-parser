"use strict";


var RE2                                                 = require("re2");
var { loopRegexes, reconciliateSplitMatch, trimString } = require("./utils");


var MAILBOXES_SEPARATORS = [
  ",", // Apple Mail, Gmail, New Outlook 2019, Thunderbird
  ";" // Outlook Live / 365, Yahoo Mail
];

var LINE_REGEXES = [
  "separator",
  "original_subject",
  "original_subject_lax",
  "original_to",
  "original_reply_to",
  "original_cc"
];

var REGEXES = {
  quote_line_break : /^(>+)\s?$/gm, // Apple Mail, Missive
  quote : /^(>+)\s?/gm, // Apple Mail
  four_spaces : /^(\ {4})\s?/gm, // Outlook 2019
  carriage_return : /\r\n/gm, // Outlook 2019
  byte_order_mark : /\uFEFF/gm, // Outlook 2019
  trailing_non_breaking_space : /\u00A0$/gm, // IONOS by 1 & 1
  non_breaking_space : /\u00A0/gm, // HubSpot

  subject : [
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
    /^Fwd:(.*)/m // Gmail (all locales), Thunderbird (all locales), Missive (en)
  ],

  separator : [
    /^>?\s*Begin forwarded message\s?:/m, // Apple Mail (en)
    /^>?\s*Začátek přeposílané zprávy\s?:/m, // Apple Mail (cs)
    /^>?\s*Start på videresendt besked\s?:/m, // Apple Mail (da)
    /^>?\s*Anfang der weitergeleiteten Nachricht\s?:/m, // Apple Mail (de)
    /^>?\s*Inicio del mensaje reenviado\s?:/m, // Apple Mail (es)
    /^>?\s*Välitetty viesti alkaa\s?:/m, // Apple Mail (fi)
    /^>?\s*Début du message réexpédié\s?:/m, // Apple Mail (fr)
    /^>?\s*Début du message transféré\s?:/m, // Apple Mail iOS (fr)
    /^>?\s*Započni proslijeđenu poruku\s?:/m, // Apple Mail (hr)
    /^>?\s*Továbbított levél kezdete\s?:/m, // Apple Mail (hu)
    /^>?\s*Inizio messaggio inoltrato\s?:/m, // Apple Mail (it)
    /^>?\s*Begin doorgestuurd bericht\s?:/m, // Apple Mail (nl)
    /^>?\s*Videresendt melding\s?:/m, // Apple Mail (no)
    /^>?\s*Początek przekazywanej wiadomości\s?:/m, // Apple Mail (pl)
    /^>?\s*Início da mensagem reencaminhada\s?:/m, // Apple Mail (pt)
    /^>?\s*Início da mensagem encaminhada\s?:/m, // Apple Mail (pt-br)
    /^>?\s*Începe mesajul redirecționat\s?:/m, // Apple Mail (ro)
    /^>?\s*Начало переадресованного сообщения\s?:/m, // Apple Mail (ro)
    /^>?\s*Začiatok preposlanej správy\s?:/m, // Apple Mail (sk)
    /^>?\s*Vidarebefordrat mejl\s?:/m, // Apple Mail (sv)
    /^>?\s*İleti başlangıcı\s?:/m, // Apple Mail (tr)
    /^>?\s*Початок листа, що пересилається\s?:/m, // Apple Mail (uk)
    /^\s*-{8,10}\s*Forwarded message\s*-{8,10}\s*/m, // Gmail (all locales), Missive (en), HubSpot (en)
    /^\s*_{32}\s*$/m, // Outlook Live / 365 (all locales)
    /^\s?Dne\s?.+\,\s?.+\s*[\[|<].+[\]|>]\s?napsal\(a\)\s?:/m, // Outlook 2019 (cz)
    /^\s?D.\s?.+\s?skrev\s?\".+\"\s*[\[|<].+[\]|>]\s?:/m, // Outlook 2019 (da)
    /^\s?Am\s?.+\s?schrieb\s?\".+\"\s*[\[|<].+[\]|>]\s?:/m, // Outlook 2019 (de)
    /^\s?On\s?.+\,\s?\".+\"\s*[\[|<].+[\]|>]\s?wrote\s?:/m, // Outlook 2019 (en)
    /^\s?El\s?.+\,\s?\".+\"\s*[\[|<].+[\]|>]\s?escribió\s?:/m, // Outlook 2019 (es)
    /^\s?Le\s?.+\,\s?«.+»\s*[\[|<].+[\]|>]\s?a écrit\s?:/m, // Outlook 2019 (fr)
    /^\s?.+\s*[\[|<].+[\]|>]\s?kirjoitti\s?.+\s?:/m, // Outlook 2019 (fi)
    /^\s?.+\s?időpontban\s?.+\s*[\[|<|(].+[\]|>|)]\s?ezt írta\s?:/m, // Outlook 2019 (hu)
    /^\s?Il giorno\s?.+\s?\".+\"\s*[\[|<].+[\]|>]\s?ha scritto\s?:/m, // Outlook 2019 (it)
    /^\s?Op\s?.+\s?heeft\s?.+\s*[\[|<].+[\]|>]\s?geschreven\s?:/m, // Outlook 2019 (nl)
    /^\s?.+\s*[\[|<].+[\]|>]\s?skrev følgende den\s?.+\s?:/m, // Outlook 2019 (no)
    /^\s?Dnia\s?.+\s?„.+”\s*[\[|<].+[\]|>]\s?napisał\s?:/m, // Outlook 2019 (pl)
    /^\s?Em\s?.+\,\s?\".+\"\s*[\[|<].+[\]|>]\s?escreveu\s?:/m, // Outlook 2019 (pt)
    /^\s?.+\s?пользователь\s?\".+\"\s*[\[|<].+[\]|>]\s?написал\s?:/m, // Outlook 2019 (ru)
    /^\s?.+\s?používateľ\s?.+\s*\([\[|<].+[\]|>]\)\s?napísal\s?:/m, // Outlook 2019 (sk)
    /^\s?Den\s?.+\s?skrev\s?\".+\"\s*[\[|<].+[\]|>]\s?följande\s?:/m, // Outlook 2019 (sv)
    /^\s?\".+\"\s*[\[|<].+[\]|>]\,\s?.+\s?tarihinde şunu yazdı\s?:/m, // Outlook 2019 (tr)
    /^\s*-{5,8} Přeposlaná zpráva -{5,8}\s*/m, // Yahoo Mail (cs), Thunderbird (cs)
    /^\s*-{5,8} Videresendt meddelelse -{5,8}\s*/m, // Yahoo Mail (da), Thunderbird (da)
    /^\s*-{5,10} Weitergeleitete Nachricht -{5,10}\s*/m, // Yahoo Mail (de), Thunderbird (de), HubSpot (de)
    /^\s*-{5,8} Forwarded Message -{5,8}\s*/m, // Yahoo Mail (en), Thunderbird (en)
    /^\s*-{5,10} Mensaje reenviado -{5,10}\s*/m, // Yahoo Mail (es), Thunderbird (es), HubSpot (es)
    /^\s*-{5,10} Edelleenlähetetty viesti -{5,10}\s*/m, // Yahoo Mail (fi), HubSpot (fi)
    /^\s*-{5} Message transmis -{5}\s*/m, // Yahoo Mail (fr)
    /^\s*-{5,8} Továbbított üzenet -{5,8}\s*/m, // Yahoo Mail (hu), Thunderbird (hu)
    /^\s*-{5,10} Messaggio inoltrato -{5,10}\s*/m, // Yahoo Mail (it), HubSpot (it)
    /^\s*-{5,10} Doorgestuurd bericht -{5,10}\s*/m, // Yahoo Mail (nl), Thunderbird (nl), HubSpot (nl)
    /^\s*-{5,8} Videresendt melding -{5,8}\s*/m, // Yahoo Mail (no), Thunderbird (no)
    /^\s*-{5} Przekazana wiadomość -{5}\s*/m, // Yahoo Mail (pl)
    /^\s*-{5,8} Mensagem reencaminhada -{5,8}\s*/m, // Yahoo Mail (pt), Thunderbird (pt)
    /^\s*-{5,10} Mensagem encaminhada -{5,10}\s*/m, // Yahoo Mail (pt-br), Thunderbird (pt-br), HubSpot (pt-br)
    /^\s*-{5,8} Mesaj redirecționat -{5,8}\s*/m, // Yahoo Mail (ro)
    /^\s*-{5} Пересылаемое сообщение -{5}\s*/m, // Yahoo Mail (ru)
    /^\s*-{5} Preposlaná správa -{5}\s*/m, // Yahoo Mail (sk)
    /^\s*-{5,10} Vidarebefordrat meddelande -{5,10}\s*/m, // Yahoo Mail (sv), Thunderbird (sv), HubSpot (sv)
    /^\s*-{5} İletilmiş Mesaj -{5}\s*/m, // Yahoo Mail (tr)
    /^\s*-{5} Перенаправлене повідомлення -{5}\s*/m, // Yahoo Mail (uk)
    /^\s*-{8} Välitetty viesti \/ Fwd.Msg -{8}\s*/m, // Thunderbird (fi)
    /^\s*-{8,10} Message transféré -{8,10}\s*/m, // Thunderbird (fr), HubSpot (fr)
    /^\s*-{8} Proslijeđena poruka -{8}\s*/m, // Thunderbird (hr)
    /^\s*-{8} Messaggio Inoltrato -{8}\s*/m, // Thunderbird (it)
    /^\s*-{3} Treść przekazanej wiadomości -{3}\s*/m, // Thunderbird (pl)
    /^\s*-{8} Перенаправленное сообщение -{8}\s*/m, // Thunderbird (ru)
    /^\s*-{8} Preposlaná správa --- Forwarded Message -{8}\s*/m, // Thunderbird (sk)
    /^\s*-{8} İletilen İleti -{8}\s*/m, // Thunderbird (tr)
    /^\s*-{8} Переслане повідомлення -{8}\s*/m, // Thunderbird (uk)
    /^\s*-{9,10} メッセージを転送 -{9,10}\s*/m, // HubSpot (ja)
    /^\s*-{9,10} Wiadomość przesłana dalej -{9,10}\s*/m, // HubSpot (pl)
    /^>?\s*-{10} Original Message -{10}\s*/m // IONOS by 1 & 1 (en)
  ],

  separator_with_information : [
    /^\s?Dne\s?(?<date>.+)\,\s?(?<from_name>.+)\s*[\[|<](?<from_address>.+)[\]|>]\s?napsal\(a\)\s?:/m, // Outlook 2019 (cz)
    /^\s?D.\s?(?<date>.+)\s?skrev\s?\"(?<from_name>.+)\"\s*[\[|<](?<from_address>.+)[\]|>]\s?:/m, // Outlook 2019 (da)
    /^\s?Am\s?(?<date>.+)\s?schrieb\s?\"(?<from_name>.+)\"\s*[\[|<](?<from_address>.+)[\]|>]\s?:/m, // Outlook 2019 (de)
    /^\s?On\s?(?<date>.+)\,\s?\"(?<from_name>.+)\"\s*[\[|<](?<from_address>.+)[\]|>]\s?wrote\s?:/m, // Outlook 2019 (en)
    /^\s?El\s?(?<date>.+)\,\s?\"(?<from_name>.+)\"\s*[\[|<](?<from_address>.+)[\]|>]\s?escribió\s?:/m, // Outlook 2019 (es)
    /^\s?Le\s?(?<date>.+)\,\s?«(?<from_name>.+)»\s*[\[|<](?<from_address>.+)[\]|>]\s?a écrit\s?:/m, // Outlook 2019 (fr)
    /^\s?(?<from_name>.+)\s*[\[|<](?<from_address>.+)[\]|>]\s?kirjoitti\s?(?<date>.+)\s?:/m, // Outlook 2019 (fi)
    /^\s?(?<date>.+)\s?időpontban\s?(?<from_name>.+)\s*[\[|<|(](?<from_address>.+)[\]|>|)]\s?ezt írta\s?:/m, // Outlook 2019 (hu)
    /^\s?Il giorno\s?(?<date>.+)\s?\"(?<from_name>.+)\"\s*[\[|<](?<from_address>.+)[\]|>]\s?ha scritto\s?:/m, // Outlook 2019 (it)
    /^\s?Op\s?(?<date>.+)\s?heeft\s?(?<from_name>.+)\s*[\[|<](?<from_address>.+)[\]|>]\s?geschreven\s?:/m, // Outlook 2019 (nl)
    /^\s?(?<from_name>.+)\s*[\[|<](?<from_address>.+)[\]|>]\s?skrev følgende den\s?(?<date>.+)\s?:/m, // Outlook 2019 (no)
    /^\s?Dnia\s?(?<date>.+)\s?„(?<from_name>.+)”\s*[\[|<](?<from_address>.+)[\]|>]\s?napisał\s?:/m, // Outlook 2019 (pl)
    /^\s?Em\s?(?<date>.+)\,\s?\"(?<from_name>.+)\"\s*[\[|<](?<from_address>.+)[\]|>]\s?escreveu\s?:/m, // Outlook 2019 (pt)
    /^\s?(?<date>.+)\s?пользователь\s?\"(?<from_name>.+)\"\s*[\[|<](?<from_address>.+)[\]|>]\s?написал\s?:/m, // Outlook 2019 (ru)
    /^\s?(?<date>.+)\s?používateľ\s?(?<from_name>.+)\s*\([\[|<](?<from_address>.+)[\]|>]\)\s?napísal\s?:/m, // Outlook 2019 (sk)
    /^\s?Den\s?(?<date>.+)\s?skrev\s?\"(?<from_name>.+)\"\s*[\[|<](?<from_address>.+)[\]|>]\s?följande\s?:/m, // Outlook 2019 (sv)
    /^\s?\"(?<from_name>.+)\"\s*[\[|<](?<from_address>.+)[\]|>]\,\s?(?<date>.+)\s?tarihinde şunu yazdı\s?:/m // Outlook 2019 (tr)
  ],

  original_subject : [
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

  original_subject_lax : [
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

  original_from : [
    /^(\*?\s*From\s?:\*?(.+))$/m, // Apple Mail (en), Outlook Live / 365 (all locales), New Outlook 2019 (en), Thunderbird (da, en), Missive (en), HubSpot (en)
    /^(\s*Od\s?:(.+))$/m, // Apple Mail (cs, pl, sk), Gmail (cs, pl, sk), New Outlook 2019 (cs, pl, sk), Thunderbird (cs, sk), HubSpot (pl)
    /^(\s*Fra\s?:(.+))$/m, // Apple Mail (da, no), Gmail (da, no), New Outlook 2019 (da), Thunderbird (no)
    /^(\s*Von\s?:(.+))$/m, // Apple Mail (de), Gmail (de), New Outlook 2019 (de), Thunderbird (de), HubSpot (de)
    /^(\s*De\s?:(.+))$/m, // Apple Mail (es, fr, pt, pt-br), Gmail (es, fr, pt, pt-br), New Outlook 2019 (es, fr, pt, pt-br), Thunderbird (fr, pt, pt-br), HubSpot (es, fr, pt-br)
    /^(\s*Lähettäjä\s?:(.+))$/m, // Apple Mail (fi), Gmail (fi), New Outlook 2019 (fi), Thunderbird (fi), HubSpot (fi)
    /^(\s*Šalje\s?:(.+))$/m, // Apple Mail (hr), Gmail (hr), Thunderbird (hr)
    /^(\s*Feladó\s?:(.+))$/m, // Apple Mail (hu), Gmail (hu), New Outlook 2019 (fr), Thunderbird (hu)
    /^(\s*Da\s?:(.+))$/m, // Apple Mail (it), Gmail (it), New Outlook 2019 (it), HubSpot (it)
    /^(\s*Van\s?:(.+))$/m, // Apple Mail (nl), Gmail (nl), New Outlook 2019 (nl), Thunderbird (nl), HubSpot (nl)
    /^(\s*Expeditorul\s?:(.+))$/m, // Apple Mail (ro)
    /^(\s*Отправитель\s?:(.+))$/m, // Apple Mail (ru)
    /^(\s*Från\s?:(.+))$/m, // Apple Mail (sv), Gmail (sv), New Outlook 2019 (sv), Thunderbird (sv), HubSpot (sv)
    /^(\s*Kimden\s?:(.+))$/m, // Apple Mail (tr), Thunderbird (tr)
    /^(\s*Від кого\s?:(.+))$/m, // Apple Mail (uk)
    /^(\s*Saatja\s?:(.+))$/m, // Gmail (et)
    /^(\s*De la\s?:(.+))$/m, // Gmail (ro)
    /^(\s*Gönderen\s?:(.+))$/m, // Gmail (tr)
    /^(\s*От\s?:(.+))$/m, // Gmail (ru), New Outlook 2019 (ru), Thunderbird (ru)
    /^(\s*Від\s?:(.+))$/m, // Gmail (uk), Thunderbird (uk)
    /^(\s*Mittente\s?:(.+))$/m, // Thunderbird (it)
    /^(\s*Nadawca\s?:(.+))$/m, // Thunderbird (pl)
    /^(\s*de la\s?:(.+))$/m, // Thunderbird (ro)
    /^(\s*送信元：(.+))$/m // HubSpot (ja)
  ],

  original_from_lax : [
    /(\s*From\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (en)
    /(\s*Od\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (cs, pl, sk)
    /(\s*Fra\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (da, no)
    /(\s*Von\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (de)
    /(\s*De\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (es, fr, pt, pt-br)
    /(\s*Lähettäjä\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (fi)
    /(\s*Feladó\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (hu)
    /(\s*Da\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (it)
    /(\s*Van\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (nl)
    /(\s*De la\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (ro)
    /(\s*От\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (ru)
    /(\s*Från\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (sv)
    /(\s*Kimden\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/, // Yahoo Mail (tr)
    /(\s*Від\s?:(.+?)\s?\n?\s*[\[|<](.+?)[\]|>])/ // Yahoo Mail (uk)
  ],

  original_to : [
    /^\*?\s*To\s?:\*?(.+)$/m, // Apple Mail (en), Gmail (all locales), Outlook Live / 365 (all locales), Thunderbird (da, en), Missive (en), HubSpot (en)
    /^\s*Komu\s?:(.+)$/m, // Apple Mail (cs), New Outlook 2019 (cs, sk), Thunderbird (cs)
    /^\s*Til\s?:(.+)$/m, // Apple Mail (da, no), New Outlook 2019 (da), Thunderbird (no)
    /^\s*An\s?:(.+)$/m, // Apple Mail (de), New Outlook 2019 (de), Thunderbird (de), HubSpot (de)
    /^\s*Para\s?:(.+)$/m, // Apple Mail (es, pt, pt-br), New Outlook 2019 (es, pt, pt-br), Thunderbird (es, pt, pt-br), HubSpot (pt-br)
    /^\s*Vastaanottaja\s?:(.+)$/m, // Apple Mail (fi), New Outlook 2019 (fi), Thunderbird (fi), HubSpot (fi)
    /^\s*À\s?:(.+)$/m, // Apple Mail (fr), New Outlook 2019 (fr), HubSpot (fr)
    /^\s*Prima\s?:(.+)$/m, // Apple Mail (hr), Thunderbird (hr)
    /^\s*Címzett\s?:(.+)$/m, // Apple Mail (hu), New Outlook 2019 (hu), Thunderbird (hu)
    /^\s*A\s?:(.+)$/m, // Apple Mail (it), New Outlook 2019 (it), Thunderbird (it), HubSpot (es, it)
    /^\s*Aan\s?:(.+)$/m, // Apple Mail (nl), New Outlook 2019 (nl), Thunderbird (nl), HubSpot (nl)
    /^\s*Do\s?:(.+)$/m, // Apple Mail (pl), New Outlook 2019 (pl), HubSpot (pl)
    /^\s*Destinatarul\s?:(.+)$/m, // Apple Mail (ro)
    /^\s*Кому\s?:(.+)$/m, // Apple Mail (ru, uk), New Outlook 2019 (ru), Thunderbird (ru, uk)
    /^\s*Pre\s?:(.+)$/m, // Apple Mail (sk), Thunderbird (sk)
    /^\s*Till\s?:(.+)$/m, // Apple Mail (sv), New Outlook 2019 (sv), Thunderbird (sv)
    /^\s*Kime\s?:(.+)$/m, // Apple Mail (tr), Thunderbird (tr)
    /^\s*Pour\s?:(.+)$/m, // Thunderbird (fr)
    /^\s*Adresat\s?:(.+)$/m, // Thunderbird (pl)
    /^\s*送信先：(.+)$/m // HubSpot (ja)
  ],

  original_to_lax : [
    /\s*To\s?:(.+)$/m, // Yahook Mail (en)
    /\s*Komu\s?:(.+)$/m, // Yahook Mail (cs, sk)
    /\s*Til\s?:(.+)$/m, // Yahook Mail (da, no, sv)
    /\s*An\s?:(.+)$/m, // Yahook Mail (de)
    /\s*Para\s?:(.+)$/m, // Yahook Mail (es, pt, pt-br)
    /\s*Vastaanottaja\s?:(.+)$/m, // Yahook Mail (fi)
    /\s*À\s?:(.+)$/m, // Yahook Mail (fr)
    /\s*Címzett\s?:(.+)$/m, // Yahook Mail (hu)
    /\s*A\s?:(.+)$/m, // Yahook Mail (it)
    /\s*Aan\s?:(.+)$/m, // Yahook Mail (nl)
    /\s*Do\s?:(.+)$/m, // Yahook Mail (pl)
    /\s*Către\s?:(.+)$/m, // Yahook Mail (ro), Thunderbird (ro)
    /\s*Кому\s?:(.+)$/m, // Yahook Mail (ru, uk)
    /\s*Till\s?:(.+)$/m, // Yahook Mail (sv)
    /\s*Kime\s?:(.+)$/m // Yahook Mail (tr)
  ],

  original_reply_to : [
    /^\s*Reply-To\s?:(.+)$/m, // Apple Mail (en)
    /^\s*Odgovori na\s?:(.+)$/m, // Apple Mail (hr)
    /^\s*Odpověď na\s?:(.+)$/m, // Apple Mail (cs)
    /^\s*Svar til\s?:(.+)$/m, // Apple Mail (da)
    /^\s*Antwoord aan\s?:(.+)$/m, // Apple Mail (nl)
    /^\s*Vastaus\s?:(.+)$/m, // Apple Mail (fi)
    /^\s*Répondre à\s?:(.+)$/m, // Apple Mail (fr)
    /^\s*Antwort an\s?:(.+)$/m, // Apple Mail (de)
    /^\s*Válaszcím\s?:(.+)$/m, // Apple Mail (hu)
    /^\s*Rispondi a\s?:(.+)$/m, // Apple Mail (it)
    /^\s*Svar til\s?:(.+)$/m, // Apple Mail (no)
    /^\s*Odpowiedź-do\s?:(.+)$/m, // Apple Mail (pl)
    /^\s*Responder A\s?:(.+)$/m, // Apple Mail (pt)
    /^\s*Responder a\s?:(.+)$/m, // Apple Mail (pt-br, es)
    /^\s*Răspuns către\s?:(.+)$/m, // Apple Mail (ro)
    /^\s*Ответ-Кому\s?:(.+)$/m, // Apple Mail (ru)
    /^\s*Odpovedať-Pre\s?:(.+)$/m, // Apple Mail (sk)
    /^\s*Svara till\s?:(.+)$/m, // Apple Mail (sv)
    /^\s*Yanıt Adresi\s?:(.+)$/m, // Apple Mail (tr)
    /^\s*Кому відповісти\s?:(.+)$/m // Apple Mail (uk)
  ],

  original_cc : [
    /^\*?\s*Cc\s?:\*?(.+)$/m, // Apple Mail (en, da, es, fr, hr, it, pt, pt-br, ro, sk), Gmail (all locales), Outlook Live / 365 (all locales), New Outlook 2019 (da, de, en, fr, it, pt-br), Missive (en), HubSpot (de, en, es, it, nl, pt-br)
    /^\s*CC\s?:(.+)$/m, // New Outlook 2019 (es, nl, pt), Thunderbird (da, en, es, fi, hr, hu, it, nl, no, pt, pt-br, ro, tr, uk)
    /^\s*Kopie\s?:(.+)$/m, // Apple Mail (cs, de, nl), New Outlook 2019 (cs), Thunderbird (cs)
    /^\s*Kopio\s?:(.+)$/m, // Apple Mail (fi), New Outlook 2019 (fi), HubSpot (fi)
    /^\s*Másolat\s?:(.+)$/m, // Apple Mail (hu)
    /^\s*Kopi\s?:(.+)$/m, // Apple Mail (no)
    /^\s*Dw\s?:(.+)$/m, // Apple Mail (pl)
    /^\s*Копия\s?:(.+)$/m, // Apple Mail (ru), New Outlook 2019 (ru), Thunderbird (ru)
    /^\s*Kopia\s?:(.+)$/m, // Apple Mail (sv), New Outlook 2019 (sv), Thunderbird (pl, sv), HubSpot (sv)
    /^\s*Bilgi\s?:(.+)$/m, // Apple Mail (tr)
    /^\s*Копія\s?:(.+)$/m, // Apple Mail (uk),
    /^\s*Másolatot kap\s?:(.+)$/m, // New Outlook 2019 (hu)
    /^\s*Kópia\s?:(.+)$/m, // New Outlook 2019 (sk), Thunderbird (sk)
    /^\s*DW\s?:(.+)$/m, // New Outlook 2019 (pl), HubSpot (pl)
    /^\s*Kopie \(CC\)\s?:(.+)$/m, // Thunderbird (de)
    /^\s*Copie à\s?:(.+)$/m, // Thunderbird (fr)
    /^\s*CC：(.+)$/m // HubSpot (ja)
  ],

  original_cc_lax : [
    /\s*Cc\s?:(.+)$/m, // Yahoo Mail (da, en, it, nl, pt, pt-br, ro, tr)
    /\s*CC\s?:(.+)$/m, // Yahoo Mail (de, es)
    /\s*Kopie\s?:(.+)$/m, // Yahoo Mail (cs)
    /\s*Kopio\s?:(.+)$/m, // Yahoo Mail (fi)
    /\s*Másolat\s?:(.+)$/m, // Yahoo Mail (hu)
    /\s*Kopi\s?:(.+)$/m, // Yahoo Mail (no)
    /\s*Dw\s?(.+)$/m, // Yahoo Mail (pl)
    /\s*Копия\s?:(.+)$/m, // Yahoo Mail (ru)
    /\s*Kópia\s?:(.+)$/m, // Yahoo Mail (sk)
    /\s*Kopia\s?:(.+)$/m, // Yahoo Mail (sv)
    /\s*Копія\s?:(.+)$/m // Yahoo Mail (uk)
  ],

  original_date : [
    /^\s*Date\s?:(.+)$/m, // Apple Mail (en, fr), Gmail (all locales), New Outlook 2019 (en, fr), Thunderbird (da, en, fr), Missive (en), HubSpot (en, fr)
    /^\s*Datum\s?:(.+)$/m, // Apple Mail (cs, de, hr, nl, sv), New Outlook 2019 (cs, de, nl, sv), Thunderbird (cs, de, hr, nl, sv), HubSpot (de, nl, sv)
    /^\s*Dato\s?:(.+)$/m, // Apple Mail (da, no), New Outlook 2019 (da), Thunderbird (no)
    /^\s*Envoyé\s?:(.+)$/m, // New Outlook 2019 (fr)
    /^\s*Fecha\s?:(.+)$/m, // Apple Mail (es), New Outlook 2019 (es), Thunderbird (es), HubSpot (es)
    /^\s*Päivämäärä\s?:(.+)$/m, // Apple Mail (fi), New Outlook 2019 (fi), HubSpot (fi)
    /^\s*Dátum\s?:(.+)$/m, // Apple Mail (hu, sk), New Outlook 2019 (sk), Thunderbird (hu, sk)
    /^\s*Data\s?:(.+)$/m, // Apple Mail (it, pl, pt, pt-br), New Outlook 2019 (it, pl, pt, pt-br), Thunderbird (it, pl, pt, pt-br), HubSpot (it, pl, pt-br)
    /^\s*Dată\s?:(.+)$/m, // Apple Mail (ro), Thunderbird (ro)
    /^\s*Дата\s?:(.+)$/m, // Apple Mail (ru, uk), New Outlook 2019 (ru), Thunderbird (ru, uk)
    /^\s*Tarih\s?:(.+)$/m, // Apple Mail (tr), Thunderbird (tr)
    /^\*?\s*Sent\s?:\*?(.+)$/m, // Outlook Live / 365 (all locales)
    /^\s*Päiväys\s?:(.+)$/m, // Thunderbird (fi)
    /^\s*日付：(.+)$/m // HubSpot (ja)
  ],

  original_date_lax : [
    /\s*Datum\s?:(.+)$/m, // Yahoo Mail (cs)
    /\s*Sendt\s?:(.+)$/m, // Yahoo Mail (da, no)
    /\s*Gesendet\s?:(.+)$/m, // Yahoo Mail (de)
    /\s*Sent\s?:(.+)$/m, // Yahoo Mail (en)
    /\s*Enviado\s?:(.+)$/m, // Yahoo Mail (es, pt, pt-br)
    /\s*Envoyé\s?:(.+)$/m, // Yahoo Mail (fr)
    /\s*Lähetetty\s?:(.+)$/m, // Yahoo Mail (fi)
    /\s*Elküldve\s?:(.+)$/m, // Yahoo Mail (hu)
    /\s*Inviato\s?:(.+)$/m, // Yahoo Mail (it)
    /\s*Verzonden\s?:(.+)$/m, // Yahoo Mail (it)
    /\s*Wysłano\s?:(.+)$/m, // Yahoo Mail (pl)
    /\s*Trimis\s?:(.+)$/m, // Yahoo Mail (ro)
    /\s*Отправлено\s?:(.+)$/m, // Yahoo Mail (ru)
    /\s*Odoslané\s?:(.+)$/m, // Yahoo Mail (sk)
    /\s*Skickat\s?:(.+)$/m, // Yahoo Mail (sv)
    /\s*Gönderilen\s?:(.+)$/m, // Yahoo Mail (tr)
    /\s*Відправлено\s?:(.+)$/m // Yahoo Mail (uk)
  ],

  mailbox : [
    /^\s?\n?\s*<.+?<mailto\:(.+?)>>/, // "<walter.sheltan@acme.com<mailto:walter.sheltan@acme.com>>"
    /^(.+?)\s?\n?\s*<.+?<mailto\:(.+?)>>/, // "Walter Sheltan <walter.sheltan@acme.com<mailto:walter.sheltan@acme.com>>"
    /^(.+?)\s?\n?\s*[\[|<]mailto\:(.+?)[\]|>]/, // "Walter Sheltan <mailto:walter.sheltan@acme.com>" or "Walter Sheltan [mailto:walter.sheltan@acme.com]" or "walter.sheltan@acme.com <mailto:walter.sheltan@acme.com>"
    /^\'(.+?)\'\s?\n?\s*[\[|<](.+?)[\]|>]/, // "'Walter Sheltan' <walter.sheltan@acme.com>" or "'Walter Sheltan' [walter.sheltan@acme.com]" or "'walter.sheltan@acme.com' <walter.sheltan@acme.com>"
    /^\"\'(.+?)\'\"\s?\n?\s*[\[|<](.+?)[\]|>]/, // ""'Walter Sheltan'" <walter.sheltan@acme.com>" or ""'Walter Sheltan'" [walter.sheltan@acme.com]" or ""'walter.sheltan@acme.com'" <walter.sheltan@acme.com>"
    /^\"(.+?)\"\s?\n?\s*[\[|<](.+?)[\]|>]/, // ""Walter Sheltan" <walter.sheltan@acme.com>" or ""Walter Sheltan" [walter.sheltan@acme.com]" or ""walter.sheltan@acme.com" <walter.sheltan@acme.com>"
    /^([^,;]+?)\s?\n?\s*[\[|<](.+?)[\]|>]/, // "Walter Sheltan <walter.sheltan@acme.com>" or "Walter Sheltan [walter.sheltan@acme.com]" or "walter.sheltan@acme.com <walter.sheltan@acme.com>"
    /^(.?)\s?\n?\s*[\[|<](.+?)[\]|>]/, // "<walter.sheltan@acme.com>"
    /^([^\s@]+@[^\s@]+\.[^\s@,]+)/, // "walter.sheltan@acme.com"
    /^([^;].+?)\s?\n?\s*[\[|<](.+?)[\]|>]/, // "Walter, Sheltan <walter.sheltan@acme.com>" or "Walter, Sheltan [walter.sheltan@acme.com]"
  ],

  mailbox_address : [
    /^(([^\s@]+)@([^\s@]+)\.([^\s@]+))$/
  ]
};


/**
 * Parser
 * @class
 */
class Parser {
  /**
   * Constructor
   */
  constructor() {
    this.__regexes = {};

    this.__initRegexes();
  }

  /**
   * Parses the subject part of the email
   * @public
   * @param  {string} subject
   * @return {object} The result
   */
  parseSubject(subject) {
    var _match = loopRegexes(this.__regexes.subject, subject);

    if (_match && _match.length > 1) {
      // Notice: return an empty string if the detected subject is empty \
      //   (e.g. 'Fwd: ')
      return trimString(_match[1]) || "";
    }

    return null;
  }


  /**
   * Parses the body part of the email
   * @public
   * @param  {string}  body
   * @param  {boolean} [forwarded]
   * @return {object}  The result
   */
  parseBody(body, forwarded = false) {
    // Replace carriage return by regular line break
    var _body = body.replace(this.__regexes.carriage_return, "\n");

    // Remove Byte Order Mark
    _body = _body.replace(this.__regexes.byte_order_mark, "");

    // Remove trailing Non-breaking space
    _body = _body.replace(this.__regexes.trailing_non_breaking_space, "");

    // Replace Non-breaking space with regular space
    _body = _body.replace(this.__regexes.non_breaking_space, " ");

    // First method: split via the separator (Apple Mail, Gmail, \
    //   Outlook Live / 365, Outlook 2019, Yahoo Mail, Thunderbird)
    // Notice: use 'line' regex that will capture the line itself, as we may \
    //   need it to build the original email back (in case of nested emails)
    var _match = loopRegexes(this.__regexes.separator_line, _body, "split");

    if (_match && _match.length > 2) {
      // The `split` operation creates a match with 3 substrings:
      //  * 0: anything before the line with the separator (i.e. the message)
      //  * 1: the line with the separator
      //  * 2: anything after the line with the separator (i.e. the body of \
      //       the original email)
      // Notice: in case of nested emails, there may be several matches \
      //   against 'separator_line'. In that case, the `split` operation \
      //   creates a match with (n x 3) substrings. We need to reconciliate \
      //   those substrings.
      var _email = reconciliateSplitMatch(
        _match,

        //-[min_substrings]
        3,

        //-[default_substrings]
        // By default, attach anything after the line with the separator
        [2]
      );

      return {
        body    : _body,

        message : trimString(_match[0]),
        email   : trimString(_email)
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
      _match = loopRegexes(this.__regexes.original_from, _body, "split");

      if (_match && _match.length > 3) {
        // The `split` operation creates a match with 4 substrings:
        //  * 0: anything before the line with the From part (i.e. the \
        //       message before the original email)
        //  * 1: the line with the From part (in the original email)
        //  * 2: the From part itself
        //  * 3: anything after the line with the From part (i.e. \
        //       the rest of the original email)
        // Notice: in case of nested emails, there may be several matches \
        //   against 'original_from'. In that case, the `split` operation \
        //   creates a match with (n x 4) substrings. We need to reconciliate \
        //   those substrings.
        var _email = reconciliateSplitMatch(
          _match,

          //-[min_substrings]
          4,

          //-[default_substrings]
          // By default, attach the line that contains the From part back to \
          //   the rest of the original email (exclude the From part itself)
          [1, 3],

          //-[fn_exlude]
          // When reconciliating other substrings, we want to exclude the From \
          //   part itself
          function(i) {
            return (i % 3 === 2);
          }
        );

        return {
          body    : _body,

          message : trimString(_match[0]),
          email   : trimString(_email)
        };
      }
    }

    return {};
  }


  /**
   * Parses the original forwarded email
   * @public
   * @param  {string} text
   * @param  {string} body
   * @return {object} The parsed email
   */
  parseOriginalEmail(text, body) {
    // Remove Byte Order Mark
    var _text = text.replace(this.__regexes.byte_order_mark, "");

    // Remove ">" at the beginning of each line, while keeping line breaks
    _text = _text.replace(this.__regexes.quote_line_break, "");

    // Remove ">" at the beginning of other lines
    _text = _text.replace(this.__regexes.quote, "");

    // Remove "    " at the beginning of lines
    _text = _text.replace(this.__regexes.four_spaces, "");

    return {
      body    : this.__parseOriginalBody(_text),

      from    : this.__parseOriginalFrom(_text, body),
      to      : this.__parseOriginalTo(_text),
      cc      : this.__parseOriginalCc(_text),

      subject : this.__parseOriginalSubject(_text),
      date    : this.__parseOriginalDate(_text, body)
    };
  }


  /**
   * Initializes regexes
   * @private
   * @return {undefined}
   */
  __initRegexes() {
    for (var _key in REGEXES) {
      var _key_line = `${_key}_line`;
      var _entry    = REGEXES[_key];

      if (Array.isArray(_entry)) {
        this.__regexes[_key]      = [];
        this.__regexes[_key_line] = [];

        for (var _i = 0; _i < _entry.length; _i++) {
          var _regex = _entry[_i];

          // Build 'line' alternative?
          if (LINE_REGEXES.includes(_key)) {
            var _regex_line = this.__buildLineRegex(_regex);

            this.__regexes[_key_line].push(_regex_line);
          }

          this.__regexes[_key].push(
            new RE2(_regex)
          );
        }
      } else {
        var _regex = _entry;

        // Build 'line' alternative?
        if (LINE_REGEXES.includes(_key)) {
          var _regex_line = this.__buildLineRegex(_regex);

          this.__regexes[_key_line] = _regex_line;
        }

        this.__regexes[_key] = new RE2(_regex);
      }
    }
  }


  /**
   * Builds 'line' alternative regex
   * @private
   * @param  {object} regex
   * @return {object} 'Line' regex
   */
  __buildLineRegex(regex) {
    // A 'line' regex will capture not only inner groups, but also the line \
    //   itself
    // Important: `regex` must be a raw regular expression literal, not an RE2 \
    //   instance. It seems that under some inexplicable circumstances, \
    //   the RE2 instance sometimes doesn't have its `source` and `flags` \
    //   properties correctly populated.
    var _source = `(${regex.source})`;
    var _flags  = regex.flags;

    return new RE2(_source, _flags);
  }


  /**
   * Parses the body part
   * @private
   * @param  {string} text
   * @return {string} The parsed body
   */
  __parseOriginalBody(text) {
    var _match = null;

    // First method: extract the text after the Subject part \
    //   (Outlook Live / 365) or after the Cc, To or Reply-To part \
    //   (Apple Mail, Gmail). A new line must be present.
    // Notice: use 'line' regexes that will capture not only the Subject, Cc, \
    //   To or Reply-To part, but also the line itself, as we may need it \
    //   to build the original body back (in case of nested emails)
    var _regexes = [
      this.__regexes.original_subject_line,
      this.__regexes.original_cc_line,
      this.__regexes.original_to_line,
      this.__regexes.original_reply_to_line
    ];

    for (var _i = 0; _i < _regexes.length; _i++) {
      _match = loopRegexes(_regexes[_i], text, "split");

      // A new line must be present between the Cc, To, Reply-To or Subject \
      //   part and the actual body
      if (_match && _match.length > 2 && _match[3].startsWith("\n\n")) {
        // The `split` operation creates a match with 4 substrings:
        //  * 0: anything before the line with the Subject, Cc, To or Reply-To \
        //       part
        //  * 1: the line with the Subject, Cc, To or Reply-To part
        //  * 2: the Subject, Cc, To or Reply-To part itself
        //  * 3: anything after the line with the Subject, Cc, To or Reply-To \
        //       part (i.e. the body of the original email)
        // Notice: in case of nested emails, there may be several matches \
        //   against 'original_subject_line', 'original_cc_line', \
        //   'original_to_line' or 'original_reply_to_line'. In that case, the \
        //   `split` operation creates a match with (n x 4) substrings. We \
        //   need to reconciliate those substrings.
        var _body = reconciliateSplitMatch(
          _match,

          //-[min_substrings]
          4,

          //-[default_substrings]
          // By default, attach anything after the line with the Subject, Cc, \
          //   To or Reply-To part
          [3],

          //-[fn_exlude]
          // When reconciliating other substrings, we want to exclude the \
          //   Subject, Cc, To or Reply-To part itself
          function(i) {
            return (i % 3 === 2);
          }
        );

        return trimString(_body);
      }
    }

    // Second method: extract the text after the Subject part \
    //   (New Outlook 2019, Yahoo Mail). No new line must be present.
    // Notice: use 'line' regexes that will capture not only the Subject part, \
    //   but also the line itself, as we may need it to build the original \
    //   body back (in case of nested emails)
    _match = loopRegexes(
      [].concat(
        this.__regexes.original_subject_line,
        this.__regexes.original_subject_lax_line
      ),

      text,
      "split"
    );

    // Do not bother checking for new line between the Subject part and the \
    //   actual body (specificity of New Outlook 2019 and Yahoo Mail)
    if (_match && _match.length > 3) {
      // The `split` operation creates a match with 4 substrings:
      //  * 0: anything before the line with the Subject part
      //  * 1: the line with the Subject part (in the original email)
      //  * 2: the Subject part itself
      //  * 3: anything after the line with the Subject part (i.e. the body of \
      //       the original email)
      // Notice: in case of nested emails, there may be several matches \
      //   against 'original_subject_line' and 'original_subject_lax_line'. In \
      //   that case, the `split` operation creates a match with (n x 4) \
      //   substrings. We need to reconciliate those substrings.
      var _body = reconciliateSplitMatch(
        _match,

        //-[min_substrings]
        4,

        //-[default_substrings]
        // By default, attach anything after the line with the Subject part
        [3],

        //-[fn_exlude]
        // When reconciliating other substrings, we want to exclude the \
        //   Subject part itself
        function(i) {
          return (i % 3 === 2);
        }
      );

      return trimString(_body);
    }

    // Third method: return the raw text, as there is no original information \
    //   embbeded (no Cc, To, Subject, etc.) (Outlook 2019)
    return text;
  }


  /**
   * Parses the author (From)
   * @private
   * @param  {string} text
   * @param  {string} body
   * @return {object} The parsed author
   */
  __parseOriginalFrom(text, body) {
    var _address = null;
    var _name = null;

    // First method: extract the author via the From part (Apple Mail, Gmail, \
    //   Outlook Live / 365, New Outlook 2019, Thunderbird)
    var _author = this.__parseMailbox(this.__regexes.original_from, text);

    // Author found?
    if ((_author || {}).address || (_author || {}).name) {
      return _author;
    }

    // Multiple authors found?
    if (Array.isArray(_author) && (_author[0].address || _author[0].name)) {
      return _author[0];
    }

    // Second method: extract the author via the separator (Outlook 2019)
    var _match = loopRegexes(this.__regexes.separator_with_information, body);

    if (_match && _match.length === 4 && _match.groups) {
      // Notice: the order of parts may change depending on the localization, \
      //   hence the use of named groups
      _address = _match.groups.from_address;
      _name = _match.groups.from_name;

      return this.__prepareMailbox(
        _address,
        _name
      );
    }

    // Third method: extract the author via the From part, using lax regexes \
    //   (Yahoo Mail)
    _match = loopRegexes(this.__regexes.original_from_lax, text);

    if (_match && _match.length > 1) {
      _address = _match[3];
      _name = _match[2];

      return this.__prepareMailbox(
        _address,
        _name
      );
    }

    return this.__prepareMailbox(
      _address,
      _name
    );
  }


  /**
   * Parses the primary recipient(s) (To)
   * @private
   * @param  {string} text
   * @return {object} The parsed primary recipient(s)
   */
  __parseOriginalTo(text) {
    // First method: extract the primary recipient(s) via the To part \
    //   (Apple Mail, Gmail, Outlook Live / 365, New Outlook 2019, Thunderbird)
    var _recipients = this.__parseMailbox(
      this.__regexes.original_to,

      text,
      true  //-[force_array]
    );

    // Recipient(s) found?
    if (Array.isArray(_recipients) && _recipients.length > 0) {
      return _recipients;
    }

    // Second method: the Subject, Date and Cc parts are stuck to the To part, \
    //   remove them before attempting a new extract, using lax regexes \
    //   (Yahoo Mail)
    var _cleanText = loopRegexes(
      this.__regexes.original_subject_lax,
      text,

      "replace"
    );

    _cleanText = loopRegexes(
      this.__regexes.original_date_lax,
      _cleanText,

      "replace"
    );

    _cleanText = loopRegexes(
      this.__regexes.original_cc_lax,
      _cleanText,

      "replace"
    );

    return this.__parseMailbox(
      this.__regexes.original_to_lax,

      _cleanText,
      true  //-[force_array]
    );
  }


  /**
   * Parses the carbon-copy recipient(s) (Cc)
   * @private
   * @param  {string} text
   * @return {object} The parsed carbon-copy recipient(s)
   */
  __parseOriginalCc(text) {
    // First method: extract the carbon-copy recipient(s) via the Cc part \
    //   (Apple Mail, Gmail, Outlook Live / 365, New Outlook 2019, Thunderbird)
    var _recipients = this.__parseMailbox(
      this.__regexes.original_cc,

      text,
      true  //-[force_array]
    );

    // Recipient(s) found?
    if (Array.isArray(_recipients) && _recipients.length > 0) {
      return _recipients;
    }

    // Second method: the Subject and Date parts are stuck to the To part, \
    //   remove them before attempting a new extract, using lax regexes \
    //   (Yahoo Mail)
    var _cleanText = loopRegexes(
      this.__regexes.original_subject_lax,
      text,

      "replace"
    );

    _cleanText = loopRegexes(
      this.__regexes.original_date_lax,
      _cleanText,

      "replace"
    );

    return this.__parseMailbox(
      this.__regexes.original_cc_lax,

      _cleanText,
      true  //-[force_array]
    );
  }


  /**
   * Parses mailboxes(s)
   * @private
   * @param  {object}  regexes
   * @param  {string}  text
   * @param  {boolean} [force_array]
   * @return {object}  The parsed mailboxes(s)
   */
  __parseMailbox(regexes, text, force_array=false) {
    var _match = loopRegexes(regexes, text);

    if (_match && _match.length > 0) {
      var _mailboxesLine = trimString(_match[_match.length - 1]);

      if (_mailboxesLine) {
        var _mailboxes = [];

        while (_mailboxesLine) {
          var _mailboxMatch = loopRegexes(
            this.__regexes.mailbox,
            _mailboxesLine
          );

          // Address and / or name available?
          if (_mailboxMatch && _mailboxMatch.length > 0) {
            var _address = null;
            var _name = null;

            // Address and name available?
            if (_mailboxMatch.length === 3) {
              _address = _mailboxMatch[2];
              _name = _mailboxMatch[1];
            } else {
              _address = _mailboxMatch[1];
            }

            _mailboxes.push(
              this.__prepareMailbox(
                _address,
                _name
              )
            );

            // Remove matched mailbox from mailboxes line
            _mailboxesLine = trimString(
              _mailboxesLine.replace(_mailboxMatch[0], "")
            );

            if (_mailboxesLine) {
              // Remove leading mailboxes separator \
              //   (", Nicholas <nicholas@globex.corp>")
              for (var _i = 0; _i < MAILBOXES_SEPARATORS.length; _i++) {
                var _separator = MAILBOXES_SEPARATORS[_i];

                if (_mailboxesLine[0] === _separator) {
                  _mailboxesLine = trimString(_mailboxesLine.substring(1));

                  break;
                }
              }
            }
          } else {
            _mailboxes.push(
              this.__prepareMailbox(
                _mailboxesLine,
                null
              )
            );

            // No more matches
            _mailboxesLine = "";
          }
        }

        // Return multiple mailboxes
        if (_mailboxes.length > 1) {
          return _mailboxes;
        }

        // Return single mailbox
        return (force_array === true) ? _mailboxes : _mailboxes[0];
      }
    }

    // No mailbox found
    return (force_array === true) ? [] : null;
  }


  /**
   * Parses the subject part
   * @private
   * @param  {string} text
   * @return {string} The parsed subject
   */
  __parseOriginalSubject(text) {
    // First method: extract the subject via the Subject part (Apple Mail, \
    //   Gmail, Outlook Live / 365, New Outlook 2019, Thunderbird)
    var _match = loopRegexes(this.__regexes.original_subject, text);

    if (_match && _match.length > 0) {
      return trimString(_match[1]);
    }

    // Second method: extract the subject via the Subject part, using lax \
    //   regexes (Yahoo Mail)
    _match = loopRegexes(this.__regexes.original_subject_lax, text);

    if (_match && _match.length > 0) {
      return trimString(_match[1]);
    }

    return null;
  }


  /**
   * Parses the date part
   * @private
   * @param  {string} text
   * @param  {string} body
   * @return {string} The parsed date
   */
  __parseOriginalDate(text, body) {
    // First method: extract the date via the Date part (Apple Mail, Gmail, \
    //   Outlook Live / 365, New Outlook 2019, Thunderbird)
    var _match = loopRegexes(this.__regexes.original_date, text);

    if (_match && _match.length > 0) {
      return trimString(_match[1]);
    }

    // Second method: extract the date via the separator (Outlook 2019)
    _match = loopRegexes(this.__regexes.separator_with_information, body);

    if (_match && _match.length === 4 && _match.groups) {
      // Notice: the order of parts may change depending on the localization, \
      //   hence the use of named groups
      return trimString(_match.groups.date);
    }

    // Third method: the Subject part is stuck to the Date part, remove it \
    //   before attempting a new extract, using lax regexes (Yahoo Mail)
    var _cleanText = loopRegexes(
      this.__regexes.original_subject_lax,
      text,

      "replace"
    );

    _match = loopRegexes(this.__regexes.original_date_lax, _cleanText);

    if (_match && _match.length > 0) {
      return trimString(_match[1]);
    }

    return null;
  }


  /**
   * Prepares mailbox
   * @private
   * @param  {string} address
   * @param  {string} name
   * @return {string} The prepared mailbox
   */
  __prepareMailbox(address, name) {
    var _address = trimString(address);
    var _name = trimString(name);

    // Make sure mailbox address is valid
    var _mailboxAddressMatch = loopRegexes(
      this.__regexes.mailbox_address,
      _address
    );

    // Invalid mailbox address? Some clients only include the name
    if ((_mailboxAddressMatch || []).length === 0) {
      _name = _address;
      _address = null;
    }

    return {
      address : _address,

      // Some clients fill the name with the address \
      //   ("bessie.berry@acme.com <bessie.berry@acme.com>")
      name    : (_address !== _name) ? _name : null
    };
  }
}


module.exports = Parser;
