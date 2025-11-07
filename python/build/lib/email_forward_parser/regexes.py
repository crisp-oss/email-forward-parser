"""Compiled regex definitions shared by the parser."""

from __future__ import annotations

import json
import re as stdlib_re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Union

try:  # pragma: no cover - optional dependency
  import re2 as re_engine  # type: ignore
except ImportError:  # pragma: no cover - default engine
  re_engine = stdlib_re


MAILBOXES_SEPARATORS: Sequence[str] = [
  ",",  # Apple Mail, Gmail, New Outlook 2019, Thunderbird
  ";",  # Outlook Live / 365, Yahoo Mail
]

# Left in place for reference with the JS version (not directly used here).
LINE_REGEXES: Sequence[str] = [
  "separator",
  "original_subject",
  "original_subject_lax",
  "original_to",
  "original_reply_to",
  "original_cc",
  "original_date",
]

_FLAG_MAPPING = {
  "i": getattr(re_engine, "IGNORECASE", stdlib_re.IGNORECASE),
  "m": getattr(re_engine, "MULTILINE", stdlib_re.MULTILINE),
  "s": getattr(re_engine, "DOTALL", stdlib_re.DOTALL),
  # `u` (unicode) and `g`/`y` (global/sticky) are handled separately
}
_NAMED_GROUP_PATTERN = stdlib_re.compile(r"\(\?<([a-zA-Z0-9_]+)>")


def _convert_flags(flags: str) -> int:
  value = 0

  for flag in flags:
    value |= _FLAG_MAPPING.get(flag, 0)

  return value


def _translate_named_groups(pattern: str) -> str:
  return _NAMED_GROUP_PATTERN.sub(r"(?P<\1>", pattern)


@dataclass
class RegexWrapper:
  """Thin wrapper that mimics the Node.js RE2 API used in the JS utilities."""

  pattern: str
  flags: str

  def __post_init__(self) -> None:
    compile_flags = _convert_flags(self.flags)
    self._global = "g" in self.flags
    self._compiled = re_engine.compile(self.pattern, compile_flags)

  @property
  def source(self) -> str:
    return self.pattern

  def match(self, text: str) -> List[str] | "RegexMatch":
    match = self._compiled.search(text or "")

    if not match:
      return []

    groups = [match.group(0), *match.groups()]
    result = RegexMatch(groups, match.start(), match.groupdict())

    return result

  def split(self, text: str) -> List[str]:
    return self._compiled.split(text or "")

  def replace(self, text: str, replacement: str = "") -> str:
    count = 0 if self._global else 1
    return self._compiled.sub(replacement, text or "", count=count)


class RegexMatch(list):
  """Array-like representation of a regex match with metadata."""

  __slots__ = ("index", "groups")

  def __init__(
    self,
    values: Iterable[str],
    index: int,
    groupdict: Dict[str, str | None],
  ):
    super().__init__(values)
    self.index = index
    self.groups = groupdict


def _load_raw_regexes() -> Dict[str, Union[dict, List[dict]]]:
  data_path = Path(__file__).resolve().parent / "data" / "regexes.json"

  with data_path.open("r", encoding="utf-8") as handle:
    return json.load(handle)


def _compile_regex(entry: Union[dict, List[dict]]) -> Union[RegexWrapper, List[RegexWrapper]]:
  if isinstance(entry, list):
    return [_build_wrapper(spec) for spec in entry]

  return _build_wrapper(entry)


def _build_wrapper(spec: dict) -> RegexWrapper:
  pattern = _translate_named_groups(spec["source"])
  flags = spec.get("flags", "")

  return RegexWrapper(pattern=pattern, flags=flags)


REGEXES: Dict[str, Union[RegexWrapper, List[RegexWrapper]]] = {
  key: _compile_regex(value)
  for key, value in _load_raw_regexes().items()
}


__all__ = ["MAILBOXES_SEPARATORS", "REGEXES", "RegexWrapper", "RegexMatch"]
