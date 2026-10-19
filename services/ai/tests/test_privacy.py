import pytest

from opshub_ai.privacy import redact_contact_values


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("Write to hello@example.test", "Write to [email removed]"),
        ("Call +20 101 234 5678", "Call [phone removed]"),
        ("اتصل على ٠١٠١٢٣٤٥٦٧٨", "اتصل على [phone removed]"),
        ("Start on 2026-10-20", "Start on 2026-10-20"),
    ],
)
def test_contact_redaction(source: str, expected: str) -> None:
    assert redact_contact_values(source) == expected
