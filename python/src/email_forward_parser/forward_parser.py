"""High-level API matching the original Node.js EmailForwardParser."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from .parser import Parser


@dataclass
class EmailForwardParser:
  """Entry point replicating the JS class interface."""

  parser: Parser = field(default_factory=Parser)

  def read(self, body: str, subject: Optional[str] = None) -> Dict[str, Any]:
    """Attempts to parse a forwarded email."""
    parsed_subject = None
    parsed_email: Dict[str, Any] = {}
    result: Dict[str, Any] = {}

    if subject:
      parsed_subject = self.parser.parseSubject(subject)

    forwarded = bool(subject and parsed_subject is not None)

    if not subject or forwarded:
      result = self.parser.parseBody(body, forwarded)

      if result.get("email"):
        forwarded = True
        parsed_email = self.parser.parseOriginalEmail(
          result["email"],
          result.get("body", ""),
        )

    email_payload = parsed_email or {}
    original_from = email_payload.get("from") or {}

    return {
      "forwarded": forwarded,
      "message": result.get("message") or None,
      "email": {
        "body": email_payload.get("body"),
        "from": {
          "address": original_from.get("address"),
          "name": original_from.get("name"),
        },
        "to": email_payload.get("to"),
        "cc": email_payload.get("cc"),
        "subject": parsed_subject or email_payload.get("subject"),
        "date": email_payload.get("date"),
      },
    }
