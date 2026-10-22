import re
from dataclasses import dataclass

LIMITS = {
    "loan_cents": (100_000, 1_000_000_000),
    "rate_hundredths": (0, 2500),
    "years": (1, 40),
}

# Exactly what JavaScript's String.prototype.trim removes, so that V2 reads text like V1.
WHITESPACE = "\u0009\u000a\u000b\u000c\u000d                  　﻿"

MAX_INTEGER_DIGITS = 15
NUMBER = re.compile(r"-?[0-9]+(\.[0-9]+)?")

SYNTAX = "Enter a number"
DECIMALS = "Use at most 2 decimals"
WHOLE = "Term must be a whole number"


def _euros(cents: int) -> str:
    return f"{cents // 100:,}"


LOAN_RANGE = (
    f"Loan amount must be between {_euros(LIMITS['loan_cents'][0])} "
    f"and {_euros(LIMITS['loan_cents'][1])} €"
)
RATE_RANGE = (
    f"Rate must be between {LIMITS['rate_hundredths'][0] // 100} "
    f"and {LIMITS['rate_hundredths'][1] // 100} %"
)
TERM_RANGE = f"Term must be between {LIMITS['years'][0]} and {LIMITS['years'][1]} years"
EXTRA_RANGE = "Extra payment must be between 0 and the loan amount"


@dataclass(frozen=True)
class ValidInput:
    loan_cents: int
    annual_rate_hundredths: int
    term_months: int
    extra_monthly_cents: int


@dataclass(frozen=True)
class Valid:
    value: ValidInput


@dataclass(frozen=True)
class Invalid:
    errors: dict[str, str]


def _parse(
    text: object, decimals: int, low: int, high: int, range_message: str, decimals_message: str
) -> int | str:
    """The value in units of 10^-decimals, or an error message."""
    if not isinstance(text, str):
        return SYNTAX
    trimmed = text.strip(WHITESPACE)
    if not NUMBER.fullmatch(trimmed):
        return SYNTAX

    negative = trimmed.startswith("-")
    integer, _, fraction = trimmed.lstrip("-").partition(".")
    fraction = fraction.rstrip("0")
    if len(fraction) > decimals:
        return decimals_message

    digits = integer.lstrip("0")
    if len(digits) > MAX_INTEGER_DIGITS:
        return range_message

    value = int(digits or "0") * 10**decimals + int(fraction.ljust(decimals, "0") or "0")
    value = -value if negative else value
    return value if low <= value <= high else range_message


def validate_inputs(
    loan: object,
    annual_rate_percent: object,
    term_years: object,
    extra_monthly_payment: object = None,
) -> Valid | Invalid:
    loan_low, loan_high = LIMITS["loan_cents"]
    rate_low, rate_high = LIMITS["rate_hundredths"]
    years_low, years_high = LIMITS["years"]

    parsed_loan = _parse(loan, 2, loan_low, loan_high, LOAN_RANGE, DECIMALS)
    parsed_rate = _parse(annual_rate_percent, 2, rate_low, rate_high, RATE_RANGE, DECIMALS)
    parsed_years = _parse(term_years, 0, years_low, years_high, TERM_RANGE, WHOLE)

    extra: int | str = 0
    extra_given = extra_monthly_payment is not None and not (
        isinstance(extra_monthly_payment, str) and extra_monthly_payment.strip(WHITESPACE) == ""
    )
    if extra_given:
        extra_high = parsed_loan if isinstance(parsed_loan, int) else loan_high
        extra = _parse(extra_monthly_payment, 2, 0, extra_high, EXTRA_RANGE, DECIMALS)

    errors = {
        name: value
        for name, value in [
            ("loan", parsed_loan),
            ("annual_rate_percent", parsed_rate),
            ("term_years", parsed_years),
            ("extra_monthly_payment", extra),
        ]
        if isinstance(value, str)
    }
    if errors:
        return Invalid(errors)

    assert isinstance(parsed_loan, int) and isinstance(parsed_rate, int)
    assert isinstance(parsed_years, int) and isinstance(extra, int)
    return Valid(ValidInput(parsed_loan, parsed_rate, parsed_years * 12, extra))
