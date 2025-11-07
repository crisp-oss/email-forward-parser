"""Low-level parser that mirrors the original Node.js implementation."""

from __future__ import annotations

from typing import Any, Dict, List, Sequence

from .regexes import MAILBOXES_SEPARATORS, REGEXES, RegexWrapper
from .utils import loop_regexes, reconciliate_split_match, trim_string


class Parser:
  """Translates the heavily-regex-based Parser from the JS source."""

  def __init__(self) -> None:
    self._regexes = REGEXES

  def parseSubject(self, subject: str | None) -> str | None:
    """Parses the subject to detect if the email was forwarded."""
    match = loop_regexes(self._regexes["subject"], subject or "")

    if match and len(match) > 1:
      return trim_string(match[1]) or ""

    return None

  def parseBody(self, body: str, forwarded: bool = False) -> Dict[str, Any]:
    """Parses the body and extracts the forwarded chunk when available."""
    text = body or ""

    text = self._regexes["carriage_return"].replace(text, "\n")
    text = self._regexes["byte_order_mark"].replace(text, "")
    text = self._regexes["trailing_non_breaking_space"].replace(text, "")
    text = self._regexes["non_breaking_space"].replace(text, " ")

    match = loop_regexes(self._regexes["separator_line"], text, "split")

    if match and len(match) > 2:
      email = reconciliate_split_match(match, 3, [2])

      return {
        "body": text,
        "message": trim_string(match[0]),
        "email": trim_string(email),
      }

    if forwarded:
      match = loop_regexes(self._regexes["original_from"], text, "split")

      if match and len(match) > 3:
        email = reconciliate_split_match(
          match,
          4,
          [1, 3],
          lambda idx: (idx % 3) == 2,
        )

        return {
          "body": text,
          "message": trim_string(match[0]),
          "email": trim_string(email),
        }

    return {}

  def parseOriginalEmail(self, text: str, body: str) -> Dict[str, Any]:
    """Parses the content of the forwarded email itself."""
    normalized = self._regexes["byte_order_mark"].replace(text or "", "")
    normalized = self._regexes["quote_line_break"].replace(normalized, "")
    normalized = self._regexes["quote"].replace(normalized, "")
    normalized = self._regexes["four_spaces"].replace(normalized, "")

    return {
      "body": self._parse_original_body(normalized),
      "from": self._parse_original_from(normalized, body),
      "to": self._parse_original_to(normalized),
      "cc": self._parse_original_cc(normalized),
      "subject": self._parse_original_subject(normalized),
      "date": self._parse_original_date(normalized, body),
    }

  def _parse_original_body(self, text: str) -> str:
    match = None

    regex_groups = [
      self._regexes["original_subject_line"],
      self._regexes["original_cc_line"],
      self._regexes["original_to_line"],
      self._regexes["original_reply_to_line"],
      self._regexes["original_date_line"],
    ]

    for regex in regex_groups:
      match = loop_regexes(regex, text, "split")

      if match and len(match) > 3 and match[3].startswith("\n\n"):
        body = reconciliate_split_match(
          match,
          4,
          [3],
          lambda idx: (idx % 3) == 2,
        )

        return trim_string(body)

    combined = (
      self._as_list(self._regexes["original_subject_line"])
      + self._as_list(self._regexes["original_subject_lax_line"])
    )

    match = loop_regexes(combined, text, "split")

    if match and len(match) > 3:
      body = reconciliate_split_match(
        match,
        4,
        [3],
        lambda idx: (idx % 3) == 2,
      )

      return trim_string(body)

    return text

  def _parse_original_from(self, text: str, body: str) -> Dict[str, Any] | None:
    address = None
    name = None

    author = self._parse_mailbox(self._regexes["original_from"], text)

    if isinstance(author, dict) and (author.get("address") or author.get("name")):
      return author

    if isinstance(author, list) and author and (
      author[0].get("address") or author[0].get("name")
    ):
      return author[0]

    match = loop_regexes(self._regexes["separator_with_information"], body)

    if match and len(match) == 4 and getattr(match, "groups", None):
      groups = match.groups or {}
      address = groups.get("from_address")
      name = groups.get("from_name")

      return self._prepare_mailbox(address, name)

    match = loop_regexes(self._regexes["original_from_lax"], text)

    if match and len(match) > 1:
      address = match[3]
      name = match[2]

      return self._prepare_mailbox(address, name)

    return self._prepare_mailbox(address, name)

  def _parse_original_to(self, text: str) -> List[Dict[str, Any]]:
    recipients = self._parse_mailbox(
      self._regexes["original_to"],
      text,
      force_array=True,
    )

    if recipients:
      return recipients

    clean_text = loop_regexes(
      self._regexes["original_subject_lax"],
      text,
      "replace",
    )
    clean_text = loop_regexes(
      self._regexes["original_date_lax"],
      clean_text,
      "replace",
    )
    clean_text = loop_regexes(
      self._regexes["original_cc_lax"],
      clean_text,
      "replace",
    )

    return self._parse_mailbox(
      self._regexes["original_to_lax"],
      clean_text,
      force_array=True,
    )

  def _parse_original_cc(self, text: str) -> List[Dict[str, Any]]:
    recipients = self._parse_mailbox(
      self._regexes["original_cc"],
      text,
      force_array=True,
    )

    if recipients:
      return recipients

    clean_text = loop_regexes(
      self._regexes["original_subject_lax"],
      text,
      "replace",
    )
    clean_text = loop_regexes(
      self._regexes["original_date_lax"],
      clean_text,
      "replace",
    )

    return self._parse_mailbox(
      self._regexes["original_cc_lax"],
      clean_text,
      force_array=True,
    )

  def _parse_mailbox(
    self,
    regexes: Sequence[RegexWrapper] | RegexWrapper,
    text: str | None,
    force_array: bool = False,
  ):
    match = loop_regexes(regexes, text or "")

    if match and len(match) > 0:
      mailboxes_line = trim_string(match[-1])

      if mailboxes_line:
        mailboxes: List[Dict[str, Any]] = []

        while mailboxes_line:
          mailbox_match = loop_regexes(self._regexes["mailbox"], mailboxes_line)

          if mailbox_match and len(mailbox_match) > 0:
            address = None
            name = None

            if len(mailbox_match) == 3:
              name = mailbox_match[1]
              address = mailbox_match[2]
            else:
              address = mailbox_match[1]

            mailboxes.append(self._prepare_mailbox(address, name))
            mailboxes_line = trim_string(
              mailboxes_line.replace(mailbox_match[0], "", 1)
            )

            if mailboxes_line:
              for separator in MAILBOXES_SEPARATORS:
                if mailboxes_line.startswith(separator):
                  mailboxes_line = trim_string(mailboxes_line[1:])
                  break
          else:
            mailboxes.append(self._prepare_mailbox(mailboxes_line, None))
            mailboxes_line = ""

        if len(mailboxes) > 1:
          return mailboxes

        return mailboxes if force_array else mailboxes[0]

    return [] if force_array else None

  def _parse_original_subject(self, text: str) -> str | None:
    match = loop_regexes(self._regexes["original_subject"], text)

    if match and len(match) > 0:
      return trim_string(match[1])

    match = loop_regexes(self._regexes["original_subject_lax"], text)

    if match and len(match) > 0:
      return trim_string(match[1])

    return None

  def _parse_original_date(self, text: str, body: str) -> str | None:
    match = loop_regexes(self._regexes["original_date"], text)

    if match and len(match) > 0:
      return trim_string(match[1])

    match = loop_regexes(self._regexes["separator_with_information"], body)

    if match and len(match) == 4 and getattr(match, "groups", None):
      groups = match.groups or {}
      return trim_string(groups.get("date"))

    clean_text = loop_regexes(
      self._regexes["original_subject_lax"],
      text,
      "replace",
    )
    match = loop_regexes(self._regexes["original_date_lax"], clean_text)

    if match and len(match) > 0:
      return trim_string(match[1])

    return None

  def _prepare_mailbox(self, address: str | None, name: str | None) -> Dict[str, Any]:
    address_value = trim_string(address)
    name_value = trim_string(name)

    mailbox_address_match = loop_regexes(
      self._regexes["mailbox_address"],
      address_value,
    )

    if not mailbox_address_match:
      name_value = address_value
      address_value = None

    if address_value == name_value:
      name_value = None

    return {
      "address": address_value or None,
      "name": name_value or None,
    }

  def _as_list(
    self,
    value: Sequence[RegexWrapper] | RegexWrapper,
  ) -> List[RegexWrapper]:
    if isinstance(value, list):
      return list(value)

    return [value]
