from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

import pytest

from email_forward_parser import EmailForwardParser


SUBJECT = "Integer consequat non purus"
BODY = (
  "Aenean quis diam urna. Maecenas eleifend vulputate ligula ac consequat. "
  "Pellentesque cursus tincidunt mauris non venenatis.\n"
  "Sed nec facilisis tellus. Nunc eget eros quis ex congue iaculis nec quis massa. "
  "Morbi in nisi tincidunt, euismod ante eget, eleifend nisi.\n\n"
  "Praesent ac ligula orci. Pellentesque convallis suscipit mi, at congue massa sagittis eget."
)
MESSAGE = "Praesent suscipit egestas hendrerit.\n\nAliquam eget dui dui."

FROM_ADDRESS = "john.doe@acme.com"
FROM_NAME = "John Doe"

TO_ADDRESS_1 = "bessie.berry@acme.com"
TO_NAME_1 = "Bessie Berry"
TO_ADDRESS_2 = "suzanne@globex.corp"
TO_NAME_2 = "Suzanne"

CC_ADDRESS_1 = "walter.sheltan@acme.com"
CC_NAME_1 = "Walter Sheltan"
CC_ADDRESS_2 = "nicholas@globex.corp"
CC_NAME_2 = "Nicholas"

PARSER = EmailForwardParser()
FIXTURES_DIR = Path(__file__).resolve().parents[2] / "test" / "fixtures"


def load_fixture(name: str) -> str:
  return (FIXTURES_DIR / f"{name}.txt").read_text(encoding="utf-8")


def parse_email(body_file: str, subject_file: Optional[str] = None):
  body = load_fixture(body_file)
  subject = load_fixture(subject_file) if subject_file else None
  return PARSER.read(body, subject)


def assert_email(
  result,
  *,
  skip_from: bool = False,
  skip_to: bool = False,
  skip_cc: bool = False,
  skip_message: bool = False,
  skip_body: bool = False,
):
  email = result.get("email") or {}

  assert result["forwarded"] is True
  assert email.get("subject") == SUBJECT

  if not skip_body:
    assert email.get("body") == BODY

  date_value = email.get("date")
  assert isinstance(date_value, str)
  assert len(date_value or "") > 1

  if not skip_from:
    sender = email.get("from") or {}
    assert sender.get("address") == FROM_ADDRESS
    assert sender.get("name") == FROM_NAME

  if not skip_to:
    to_items = email.get("to") or []
    first_to = to_items[0] if to_items else {}
    assert first_to.get("address") == TO_ADDRESS_1
    assert first_to.get("name") is None

  if not skip_cc:
    cc_items = email.get("cc") or []
    first_cc = cc_items[0] if len(cc_items) > 0 else {}
    second_cc = cc_items[1] if len(cc_items) > 1 else {}
    assert first_cc.get("address") == CC_ADDRESS_1
    assert first_cc.get("name") == CC_NAME_1
    assert second_cc.get("address") == CC_ADDRESS_2
    assert second_cc.get("name") == CC_NAME_2

  if not skip_message:
    assert result.get("message") == MESSAGE


def normalize_cases(entries: Iterable[Tuple[str, Optional[str]] | str]):
  for entry in entries:
    if isinstance(entry, tuple):
      yield entry
    else:
      yield (entry, None)


def case_ids(entries: Iterable[Tuple[str, Optional[str]] | str]) -> List[str]:
  labels: List[str] = []

  for entry in entries:
    if isinstance(entry, tuple):
      labels.append(entry[0])
    else:
      labels.append(entry)

  return labels


COMMON_CASES = [
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
  "hubspot_de_body",
  "hubspot_en_body",
  "hubspot_es_body",
  "hubspot_fi_body",
  "hubspot_fr_body",
  "hubspot_it_body",
  "hubspot_ja_body",
  "hubspot_nl_body",
  "hubspot_pl_body",
  "hubspot_pt_br_body",
  "hubspot_sv_body",
  "ionos_one_and_one_en_body",
  "mailmate_en_body",
  "missive_en_body",
  ("outlook_live_body", "outlook_live_cs_subject"),
  ("outlook_live_body", "outlook_live_da_subject"),
  ("outlook_live_body", "outlook_live_de_subject"),
  ("outlook_live_body", "outlook_live_en_subject"),
  ("outlook_live_body", "outlook_live_es_subject"),
  ("outlook_live_body", "outlook_live_fr_subject"),
  ("outlook_live_body", "outlook_live_hr_subject"),
  ("outlook_live_body", "outlook_live_hu_subject"),
  ("outlook_live_body", "outlook_live_it_subject"),
  ("outlook_live_body", "outlook_live_nl_subject"),
  ("outlook_live_body", "outlook_live_no_subject"),
  ("outlook_live_body", "outlook_live_pl_subject"),
  ("outlook_live_body", "outlook_live_pt_br_subject"),
  ("outlook_live_body", "outlook_live_pt_subject"),
  ("outlook_live_body", "outlook_live_ro_subject"),
  ("outlook_live_body", "outlook_live_sk_subject"),
  ("outlook_live_body", "outlook_live_sv_subject"),
  ("outlook_2013_en_body", "outlook_2013_en_subject"),
  ("new_outlook_2019_cs_body", "new_outlook_2019_cs_subject"),
  ("new_outlook_2019_da_body", "new_outlook_2019_da_subject"),
  ("new_outlook_2019_de_body", "new_outlook_2019_de_subject"),
  ("new_outlook_2019_en_body", "new_outlook_2019_en_subject"),
  ("new_outlook_2019_es_body", "new_outlook_2019_es_subject"),
  ("new_outlook_2019_fi_body", "new_outlook_2019_fi_subject"),
  ("new_outlook_2019_fr_body", "new_outlook_2019_fr_subject"),
  ("new_outlook_2019_hu_body", "new_outlook_2019_hu_subject"),
  ("new_outlook_2019_it_body", "new_outlook_2019_it_subject"),
  ("new_outlook_2019_nl_body", "new_outlook_2019_nl_subject"),
  ("new_outlook_2019_no_body", "new_outlook_2019_no_subject"),
  ("new_outlook_2019_pl_body", "new_outlook_2019_pl_subject"),
  ("new_outlook_2019_pt_br_body", "new_outlook_2019_pt_br_subject"),
  ("new_outlook_2019_pt_body", "new_outlook_2019_pt_subject"),
  ("new_outlook_2019_ru_body", "new_outlook_2019_ru_subject"),
  ("new_outlook_2019_sk_body", "new_outlook_2019_sk_subject"),
  ("new_outlook_2019_sv_body", "new_outlook_2019_sv_subject"),
  ("new_outlook_2019_tr_body", "new_outlook_2019_tr_subject"),
  ("outlook_2019_cz_body", "outlook_2019_subject"),
  ("outlook_2019_da_body", "outlook_2019_subject"),
  ("outlook_2019_de_body", "outlook_2019_subject"),
  ("outlook_2019_en_body", "outlook_2019_subject"),
  ("outlook_2019_es_body", "outlook_2019_subject"),
  ("outlook_2019_fi_body", "outlook_2019_subject"),
  ("outlook_2019_fr_body", "outlook_2019_subject"),
  ("outlook_2019_hu_body", "outlook_2019_subject"),
  ("outlook_2019_it_body", "outlook_2019_subject"),
  ("outlook_2019_nl_body", "outlook_2019_subject"),
  ("outlook_2019_no_body", "outlook_2019_subject"),
  ("outlook_2019_pl_body", "outlook_2019_subject"),
  ("outlook_2019_pt_body", "outlook_2019_subject"),
  ("outlook_2019_ru_body", "outlook_2019_subject"),
  ("outlook_2019_sk_body", "outlook_2019_subject"),
  ("outlook_2019_sv_body", "outlook_2019_subject"),
  ("outlook_2019_tr_body", "outlook_2019_subject"),
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
  "yahoo_uk_body",
]


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  list(normalize_cases(COMMON_CASES)),
  ids=case_ids(COMMON_CASES),
)
def test_common(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  skip_to = body_name.startswith("outlook_2019_")
  skip_cc = skip_to or body_name.startswith("ionos_one_and_one_")

  assert_email(
    result,
    skip_to=skip_to,
    skip_cc=skip_cc,
    skip_message=True,
  )

  assert result.get("message") is None


VARIANT1_CASES = [
  "apple_mail_en_body_variant_1",
  "gmail_en_body_variant_1",
  "hubspot_en_body_variant_1",
  "mailmate_en_body_variant_1",
  "missive_en_body_variant_1",
  ("outlook_live_en_body_variant_1", "outlook_live_en_subject"),
  ("new_outlook_2019_en_body_variant_1", "new_outlook_2019_en_subject"),
  "yahoo_en_body_variant_1",
  "thunderbird_en_body_variant_1",
]


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  list(normalize_cases(VARIANT1_CASES)),
  ids=case_ids(VARIANT1_CASES),
)
def test_variant1(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_to=True,
    skip_cc=True,
    skip_message=True,
  )

  to_items = result["email"].get("to") or []
  first = to_items[0] if len(to_items) > 0 else {}
  second = to_items[1] if len(to_items) > 1 else {}
  assert first.get("address") == TO_ADDRESS_1
  assert first.get("name") is None
  assert second.get("address") == TO_ADDRESS_2
  assert second.get("name") is None

  assert len(result["email"].get("cc") or []) == 0


VARIANT2_CASES = [
  "apple_mail_en_body_variant_2",
  "gmail_en_body_variant_2",
  "hubspot_en_body_variant_2",
  "ionos_one_and_one_en_body_variant_2",
  "mailmate_en_body_variant_2",
  "missive_en_body_variant_2",
  ("outlook_live_en_body_variant_2", "outlook_live_en_subject"),
  ("new_outlook_2019_en_body_variant_2", "new_outlook_2019_en_subject"),
  ("outlook_2019_en_body_variant_2", "outlook_2019_subject"),
  "yahoo_en_body_variant_2",
  "thunderbird_en_body_variant_2",
]


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  list(normalize_cases(VARIANT2_CASES)),
  ids=case_ids(VARIANT2_CASES),
)
def test_variant2(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  skip_cc = body_name in {
    "outlook_2019_en_body_variant_2",
    "ionos_one_and_one_en_body_variant_2",
  }

  assert_email(
    result,
    skip_to=True,
    skip_cc=skip_cc,
  )

  if body_name != "outlook_2019_en_body_variant_2":
    to_items = result["email"].get("to") or []
    first = to_items[0] if len(to_items) > 0 else {}
    second = to_items[1] if len(to_items) > 1 else {}
    assert first.get("address") == TO_ADDRESS_1
    assert second.get("address") == TO_ADDRESS_2


VARIANT3_CASES = [
  "apple_mail_en_body_variant_3",
  "gmail_en_body_variant_3",
  "missive_en_body_variant_3",
  ("outlook_live_en_body_variant_3", "outlook_live_en_subject"),
  ("new_outlook_2019_en_body_variant_3", "new_outlook_2019_en_subject"),
  "yahoo_en_body_variant_3",
  "thunderbird_en_body_variant_3",
]


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  list(normalize_cases(VARIANT3_CASES)),
  ids=case_ids(VARIANT3_CASES),
)
def test_variant3(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_to=True,
    skip_cc=True,
    skip_message=True,
  )

  to_items = result["email"].get("to") or []
  first_to = to_items[0] if len(to_items) > 0 else {}
  second_to = to_items[1] if len(to_items) > 1 else {}
  assert first_to.get("address") == TO_ADDRESS_1
  assert first_to.get("name") == TO_NAME_1
  assert second_to.get("address") == TO_ADDRESS_2
  assert second_to.get("name") is None

  cc_items = result["email"].get("cc") or []
  first_cc = cc_items[0] if len(cc_items) > 0 else {}
  second_cc = cc_items[1] if len(cc_items) > 1 else {}
  assert first_cc.get("address") == CC_ADDRESS_1
  assert first_cc.get("name") is None
  assert second_cc.get("address") == CC_ADDRESS_2
  assert second_cc.get("name") == CC_NAME_2


VARIANT4_CASES = [
  "apple_mail_en_body_variant_4",
  "gmail_en_body_variant_4",
  "hubspot_en_body_variant_4",
  "mailmate_en_body_variant_4",
  "missive_en_body_variant_4",
  ("outlook_live_en_body_variant_4", "outlook_live_en_subject_variant_4"),
  ("new_outlook_2019_en_body_variant_4", "new_outlook_2019_en_subject_variant_4"),
  ("outlook_2019_en_body_variant_4", "outlook_2019_en_subject_variant_4"),
  "yahoo_en_body_variant_4",
  "thunderbird_en_body_variant_4",
]


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  list(normalize_cases(VARIANT4_CASES)),
  ids=case_ids(VARIANT4_CASES),
)
def test_variant4(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)
  assert result["forwarded"] is False


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  [("apple_mail_en_body_variant_5", None)],
)
def test_variant5(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_from=True,
    skip_message=True,
  )

  sender = result["email"].get("from") or {}
  assert sender.get("address") == FROM_ADDRESS
  assert sender.get("name") is None


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  [("apple_mail_en_body_variant_6", None)],
)
def test_variant6(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_cc=True,
    skip_message=True,
  )


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  [("apple_mail_en_body_variant_7", None)],
)
def test_variant7(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_to=True,
    skip_cc=True,
    skip_message=True,
  )

  to_items = result["email"].get("to") or []
  first_to = to_items[0] if len(to_items) > 0 else {}
  second_to = to_items[1] if len(to_items) > 1 else {}
  assert first_to.get("address") == TO_ADDRESS_1
  assert first_to.get("name") == "Bessie, Berry"
  assert second_to.get("address") == TO_ADDRESS_2
  assert second_to.get("name") == TO_NAME_2

  cc_items = result["email"].get("cc") or []
  first_cc = cc_items[0] if len(cc_items) > 0 else {}
  second_cc = cc_items[1] if len(cc_items) > 1 else {}
  assert first_cc.get("address") == CC_ADDRESS_1
  assert first_cc.get("name") is None
  assert second_cc.get("address") == CC_ADDRESS_2
  assert second_cc.get("name") is None


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  [("outlook_live_en_body_variant_8", None)],
)
def test_variant8(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_body=True,
  )

  email_text = load_fixture(body_name)
  separator = f"Subject: {SUBJECT}\n"
  body = email_text.split(separator)[1].strip()

  assert result["email"]["body"] == body


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  [("outlook_live_en_body_variant_9", None)],
)
def test_variant9(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)
  assert_email(result)


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  [("outlook_live_en_body_variant_10", "outlook_live_en_subject_variant_10")],
)
def test_variant10(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)
  assert_email(result)


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  [("outlook_live_en_body_variant_11", None)],
)
def test_variant11(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_from=True,
    skip_to=True,
    skip_cc=True,
    skip_message=True,
  )

  sender = result["email"].get("from") or {}
  assert sender.get("address") == FROM_ADDRESS
  assert sender.get("name") == "John, Doe"

  to_items = result["email"].get("to") or []
  first_to = to_items[0] if len(to_items) > 0 else {}
  second_to = to_items[1] if len(to_items) > 1 else {}
  assert first_to.get("address") == TO_ADDRESS_1
  assert first_to.get("name") == "Bessie, Berry"
  assert second_to.get("address") == TO_ADDRESS_2
  assert second_to.get("name") is None

  cc_items = result["email"].get("cc") or []
  first_cc = cc_items[0] if len(cc_items) > 0 else {}
  second_cc = cc_items[1] if len(cc_items) > 1 else {}
  assert first_cc.get("address") == CC_ADDRESS_1
  assert first_cc.get("name") == "Walter, Sheltan"
  assert second_cc.get("address") == CC_ADDRESS_2
  assert second_cc.get("name") == "Nicholas, Landers"


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  [("unknown_en_body_variant_12", "unknown_en_subject")],
)
def test_variant12(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_from=True,
    skip_to=True,
    skip_cc=True,
    skip_message=True,
  )

  sender = result["email"].get("from") or {}
  assert sender.get("address") is None
  assert sender.get("name") == FROM_NAME

  to_items = result["email"].get("to") or []
  first_to = to_items[0] if len(to_items) > 0 else {}
  assert first_to.get("address") is None
  assert first_to.get("name") == TO_NAME_1


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  [("apple_mail_en_body_variant_13", None)],
)
def test_variant13(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_body=True,
  )

  email_text = load_fixture(body_name)
  separator = f"Subject: {SUBJECT}\n"
  body = email_text.split(separator, 1)[1]
  body = re.sub(r"^(>+)\s?$", "", body, flags=re.MULTILINE)
  body = re.sub(r"^(>+)\s?", "", body, flags=re.MULTILINE)
  body = body.replace("\ufeff", "").strip()

  assert result["email"]["body"] == body
  assert result["email"]["body"].startswith(BODY)


VARIANT14_CASES = [
  "gmail_en_body_variant_14",
  ("outlook_live_en_body_variant_14", "outlook_live_en_subject"),
  ("new_outlook_2019_en_body_variant_14", "new_outlook_2019_fr_subject"),
  ("new_outlook_2019_en_body_variant_14_1", "new_outlook_2019_fr_subject"),
  "thunderbird_en_body_variant_14",
]


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  list(normalize_cases(VARIANT14_CASES)),
  ids=case_ids(VARIANT14_CASES),
)
def test_variant14(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_body=True,
  )

  email_text = load_fixture(body_name)
  if body_name == "thunderbird_en_body_variant_14":
    separator = _extract_cc_separator(email_text)
  else:
    separator = f"Subject: {SUBJECT}\n"

  body = email_text.split(separator, 1)[1].strip()
  assert result["email"]["body"] == body


VARIANT15_CASES = [
  "gmail_en_body_variant_15",
  ("outlook_live_en_body_variant_15", "outlook_live_en_subject"),
  ("new_outlook_2019_en_body_variant_15", "new_outlook_2019_fr_subject"),
  "thunderbird_en_body_variant_15",
]


@pytest.mark.parametrize(
  ("body_name", "subject_name"),
  list(normalize_cases(VARIANT15_CASES)),
  ids=case_ids(VARIANT15_CASES),
)
def test_variant15(body_name: str, subject_name: Optional[str]):
  result = parse_email(body_name, subject_name)

  assert_email(
    result,
    skip_body=True,
  )

  email_text = load_fixture(body_name)
  if body_name == "thunderbird_en_body_variant_15":
    separator = _extract_cc_separator(email_text)
  else:
    separator = f"Subject: {SUBJECT}\n"

  body = email_text.split(separator, 1)[1].strip()
  assert result["email"]["body"] == body


def _extract_cc_separator(raw_email: str) -> str:
  for line in raw_email.splitlines(keepends=True):
    if line.startswith("CC:"):
      return line

  raise ValueError("CC line not found in fixture")
