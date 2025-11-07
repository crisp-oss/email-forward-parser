"""Utility helpers ported from the JS implementation."""

from __future__ import annotations

from typing import Callable, Iterable, List, Sequence, Union

from .regexes import RegexWrapper


RegexCollection = Union[RegexWrapper, Sequence[RegexWrapper]]


def loop_regexes(
  regexes: RegexCollection,
  text: str,
  mode: str = "match",
  highest_position: bool = True
):
  """Executes multiple regexes until one succeeds, mirroring JS semantics."""
  candidates = _ensure_sequence(regexes)
  original_text = text or ""
  text = original_text

  match = None
  min_length = 1 if mode == "split" else 0
  max_length = len(text)

  for regex in candidates:
    if mode == "replace":
      current = regex.replace(text, "")

      if len(current) < max_length:
        match = current
        break

      continue

    if mode == "split":
      current = regex.split(text)

      if len(current or []) > min_length:
        match = _pick_split_match(match, current, highest_position)

        if not highest_position:
          break

      continue

    # Default: "match"
    current = regex.match(text)

    if current and len(current) > min_length:
      match = _pick_regex_match(match, current, highest_position)

      if not highest_position:
        break

  if mode == "replace":
    return match if match is not None else original_text

  return match or []


def _ensure_sequence(regexes: RegexCollection) -> Sequence[RegexWrapper]:
  if isinstance(regexes, (list, tuple)):
    return regexes

  return [regexes]


def _pick_split_match(previous, current, highest_position: bool):
  if previous is None:
    return current

  if highest_position and len(previous[0]) > len(current[0]):
    return current

  return previous


def _pick_regex_match(previous, current, highest_position: bool):
  if previous is None:
    return current

  if highest_position and getattr(previous, "index", 0) > getattr(current, "index", 0):
    return current

  return previous


def reconciliate_split_match(
  match: Sequence[str],
  min_substrings: int,
  default_substrings: Sequence[int],
  fn_exclude: Callable[[int], bool] | None = None
) -> str:
  """Reconciliates match substrings after a split operation."""
  result = "".join(match[i] for i in default_substrings)

  if len(match) > min_substrings:
    for idx in range(min_substrings, len(match)):
      if fn_exclude and fn_exclude(idx):
        continue

      result += match[idx]

  return result


def trim_string(value: str | None) -> str:
  """Trims a string and normalizes falsy values to an empty string."""
  return (value or "").strip()


__all__ = ["loop_regexes", "reconciliate_split_match", "trim_string"]
