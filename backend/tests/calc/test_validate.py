from app.calc.validate import LIMITS, Invalid, Valid, ValidInput, validate_inputs

LOAN_RANGE = "Loan amount must be between 1,000 and 10,000,000 €"
RATE_RANGE = "Rate must be between 0 and 25 %"
TERM_RANGE = "Term must be between 1 and 40 years"
EXTRA_RANGE = "Extra payment must be between 0 and the loan amount"
SYNTAX = "Enter a number"


def check(loan, rate, years, extra=""):
    return validate_inputs(loan, rate, years, extra)


def ok(loan_cents, rate_hundredths, months, extra_cents=0):
    return Valid(ValidInput(loan_cents, rate_hundredths, months, extra_cents))


def fails(**errors):
    return Invalid(dict(errors))


# --- ported from V1 (FR3) ---


def test_validate_valid_typical():
    assert check("100000", "4", "20") == ok(10_000_000, 400, 240)


def test_validate_trims_spaces():
    assert check(" 100000 ", " 4", "20 ") == ok(10_000_000, 400, 240)


def test_validate_trims_tab_and_no_break_space():
    assert check("\t100000 ", "4", "20") == ok(10_000_000, 400, 240)


def test_validate_loan_empty():
    assert check("", "4", "20") == fails(loan=SYNTAX)


def test_validate_loan_not_numeric():
    assert check("abc", "4", "20") == fails(loan=SYNTAX)


def test_validate_loan_whitespace_only():
    assert check("   ", "4", "20") == fails(loan=SYNTAX)


def test_validate_rejects_non_decimal_syntax():
    spellings = [
        "1e3", "Infinity", "NaN", ".5", "5.", "+5", "0x10", "1,000", "1.2.3",
        "1 000", "-", "--5", "- 5", "１００", "−5",
    ]  # fmt: skip
    for spelling in spellings:
        assert check(spelling, "4", "20") == fails(loan=SYNTAX), spelling


def test_validate_decimal_comma_rejected():
    assert check("100000", "3,75", "20") == fails(annual_rate_percent=SYNTAX)


def test_validate_leading_zeros_allowed():
    assert check("0001000", "4", "20") == ok(100_000, 400, 240)


def test_validate_negative_zero_is_zero():
    assert check("100000", "-0", "20") == ok(10_000_000, 0, 240)


def test_validate_loan_three_decimals():
    assert check("1000.005", "4", "20") == fails(loan="Use at most 2 decimals")


def test_validate_rate_three_decimals():
    assert check("100000", "4.005", "20") == fails(annual_rate_percent="Use at most 2 decimals")


def test_validate_trailing_zeros_allowed():
    assert check("1000.500", "4.250", "20") == ok(100_050, 425, 240)


def test_validate_decimals_checked_before_range():
    assert check("100000", "25.001", "20") == fails(annual_rate_percent="Use at most 2 decimals")


def test_validate_check_order_edge_cases():
    assert check("100000", "-0.001", "20") == fails(annual_rate_percent="Use at most 2 decimals")
    assert check("100000", "4", "0.5") == fails(term_years="Term must be a whole number")
    assert check("-0", "4", "20") == fails(loan=LOAN_RANGE)
    assert check("1" + "0" * 400, "4", "20") == fails(loan=LOAN_RANGE)


def test_validate_term_fraction():
    assert check("100000", "4", "20.5") == fails(term_years="Term must be a whole number")


def test_validate_term_trailing_zero():
    assert check("100000", "4", "20.0") == ok(10_000_000, 400, 240)


def test_validate_loan_below_min():
    assert check("999.99", "4", "20") == fails(loan=LOAN_RANGE)


def test_validate_loan_at_min():
    assert check("1000", "4", "20") == ok(100_000, 400, 240)


def test_validate_loan_at_max():
    assert check("10000000", "4", "20") == ok(1_000_000_000, 400, 240)


def test_validate_loan_above_max():
    assert check("10000000.01", "4", "20") == fails(loan=LOAN_RANGE)


def test_validate_loan_negative():
    assert check("-5000", "4", "20") == fails(loan=LOAN_RANGE)


def test_validate_rate_zero_allowed():
    assert check("100000", "0", "20") == ok(10_000_000, 0, 240)


def test_validate_rate_negative():
    assert check("100000", "-0.01", "20") == fails(annual_rate_percent=RATE_RANGE)


def test_validate_rate_at_max():
    assert check("100000", "25", "20") == ok(10_000_000, 2500, 240)


def test_validate_rate_above_max():
    assert check("100000", "25.01", "20") == fails(annual_rate_percent=RATE_RANGE)


def test_validate_term_zero():
    assert check("100000", "4", "0") == fails(term_years=TERM_RANGE)


def test_validate_term_negative():
    assert check("100000", "4", "-1") == fails(term_years=TERM_RANGE)


def test_validate_term_at_bounds():
    assert check("100000", "4", "1") == ok(10_000_000, 400, 12)
    assert check("100000", "4", "40") == ok(10_000_000, 400, 480)


def test_validate_term_above_max():
    assert check("100000", "4", "41") == fails(term_years=TERM_RANGE)


def test_validate_each_field_own_message():
    assert check("", "30", "20") == fails(loan=SYNTAX, annual_rate_percent=RATE_RANGE)


def test_validate_all_fields_invalid():
    assert check("", "x", "") == fails(loan=SYNTAX, annual_rate_percent=SYNTAX, term_years=SYNTAX)


def test_validate_limits_constants():
    assert LIMITS == {
        "loan_cents": (100_000, 1_000_000_000),
        "rate_hundredths": (0, 2500),
        "years": (1, 40),
    }


# --- new: more edge cases of FR3 ---


def test_validate_huge_digit_string_is_range_error():
    assert check("1" * 5000, "4", "20") == fails(loan=LOAN_RANGE)


def test_validate_unicode_digits_rejected():
    assert check("１００００", "４", "２０") == fails(
        loan=SYNTAX, annual_rate_percent=SYNTAX, term_years=SYNTAX
    )


def test_validate_trims_exactly_javascript_whitespace():
    trimmed = [
        "\u0009", "\u000a", "\u000b", "\u000c", "\u000d", " ", " ", " ",
        " ", " ", " ", " ", " ", " ", "　", "﻿",
    ]  # fmt: skip
    for char in trimmed:
        assert check(char + "100000" + char, "4", "20") == ok(10_000_000, 400, 240), repr(char)
    for char in ["\u001c", "\u001f", "\u0085"]:
        assert check(char + "100000" + char, "4", "20") == fails(loan=SYNTAX), repr(char)


def test_validate_leading_zeros_do_not_count_as_digits():
    assert check("0" * 20 + "1000", "4", "20") == ok(100_000, 400, 240)


def test_validate_many_trailing_zeros_ok():
    assert check("1000.5" + "0" * 5000, "4", "20") == ok(100_050, 400, 240)


def test_validate_huge_digit_strings_in_rate_and_years():
    assert check("100000", "1" * 5000, "20") == fails(annual_rate_percent=RATE_RANGE)
    assert check("100000", "4", "1" * 5000) == fails(term_years=TERM_RANGE)


# --- new: the extra payment field (FR6) ---


def test_validate_extra_empty_means_none():
    for extra in ["", "   ", "\t", " ", None]:
        assert check("100000", "4", "20", extra) == ok(10_000_000, 400, 240, 0), repr(extra)


def test_validate_extra_zero_means_none():
    assert check("100000", "4", "20", "0") == ok(10_000_000, 400, 240, 0)


def test_validate_extra_valid():
    assert check("100000", "4", "20", "200.5") == ok(10_000_000, 400, 240, 20050)


def test_validate_extra_not_numeric():
    assert check("100000", "4", "20", "abc") == fails(extra_monthly_payment=SYNTAX)


def test_validate_extra_three_decimals():
    assert check("100000", "4", "20", "10.005") == fails(
        extra_monthly_payment="Use at most 2 decimals"
    )


def test_validate_extra_negative():
    assert check("100000", "4", "20", "-1") == fails(extra_monthly_payment=EXTRA_RANGE)


def test_validate_extra_equals_loan_ok():
    assert check("100000", "4", "20", "100000") == ok(10_000_000, 400, 240, 10_000_000)


def test_validate_extra_above_loan():
    assert check("100000", "4", "20", "100000.01") == fails(extra_monthly_payment=EXTRA_RANGE)


def test_validate_extra_bound_when_loan_invalid():
    assert check("", "4", "20", "10000000.01") == fails(
        loan=SYNTAX, extra_monthly_payment=EXTRA_RANGE
    )


def test_validate_extra_ok_when_loan_invalid():
    assert check("", "4", "20", "5000") == fails(loan=SYNTAX)


def test_validate_extra_bound_when_loan_out_of_range():
    assert check("999.99", "4", "20", "10000000") == fails(loan=LOAN_RANGE)
    assert check("999.99", "4", "20", "10000000.01") == fails(
        loan=LOAN_RANGE, extra_monthly_payment=EXTRA_RANGE
    )


def test_validate_extra_huge_digit_string_is_range_error():
    assert check("100000", "4", "20", "1" * 5000) == fails(extra_monthly_payment=EXTRA_RANGE)


def test_validate_extra_bound_when_loan_has_decimals_error():
    assert check("1000.005", "4", "20", "10000000") == fails(loan="Use at most 2 decimals")


def test_validate_extra_negative_zero_means_none():
    assert check("100000", "4", "20", "-0.00") == ok(10_000_000, 400, 240, 0)
