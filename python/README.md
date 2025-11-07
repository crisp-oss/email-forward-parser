# Email Forward Parser (Python)

Python port of [crisp-oss/email-forward-parser](https://github.com/crisp-oss/email-forward-parser).

## Installation

```bash
pip install .
```

Optional RE2 support:

```bash
pip install .[re2]
```

## Usage

```python
from email_forward_parser import EmailForwardParser

parser = EmailForwardParser()
result = parser.read(BODY_STRING, SUBJECT_STRING)

print(result["forwarded"])
print(result["email"]["from"])
```

## Development

```bash
pip install -e .[dev]
PYTHONPATH=src python -m pytest
```
