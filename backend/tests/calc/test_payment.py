from decimal import Decimal
from fractions import Fraction

import pytest

from app.calc.payment import annuity_payment, calculate_loan


def calc(loan: str, rate: str, months: int):
    """Inputs as in the V1 scenarios (euros, percent), converted to cents and hundredths."""
    return calculate_loan(int(Decimal(loan) * 100), int(Decimal(rate) * 100), months)


# --- FR1: monthly payment ---


def test_payment_standard_100k_4pct_20y():
    assert calc("100000", "4", 240).monthly_payment_cents == 60598


def test_payment_standard_200k_3_5pct_30y():
    assert calc("200000", "3.5", 360).monthly_payment_cents == 89809


def test_payment_typical_250k_4_5pct_25y():
    assert calc("250000", "4.5", 300).monthly_payment_cents == 138958


def test_payment_zero_rate_120k_10y():
    assert calc("120000", "0", 120).monthly_payment_cents == 100000


def test_payment_zero_rate_rounds_up():
    assert calc("100000", "0", 36).monthly_payment_cents == 277778


def test_payment_zero_rate_rounds_down():
    assert calc("1000", "0", 12).monthly_payment_cents == 8333


def test_payment_tie_half_up_not_half_even():
    assert calc("1000.14", "0", 12).monthly_payment_cents == 8335


def test_payment_tie_float_hazard():
    assert calc("1000.02", "0", 12).monthly_payment_cents == 8334


def test_payment_tie_positive_rate_one_month():
    assert calc("1000", "0.03", 1).monthly_payment_cents == 100003


def test_payment_tie_positive_rate_float_hazard():
    assert calc("1000", "0.09", 1).monthly_payment_cents == 100008


def test_payment_min_loan_max_rate_1y():
    assert calc("1000", "25", 12).monthly_payment_cents == 9504


def test_payment_max_loan_max_rate_max_term():
    assert calc("10000000", "25", 480).monthly_payment_cents == 20834382


def test_payment_tiny_rate_0_01pct():
    assert calc("100000", "0.01", 120).monthly_payment_cents == 83375


def test_payment_one_month_term():
    assert calc("5000", "6", 1).monthly_payment_cents == 502500


def test_payment_no_v1_maximum():
    assert calc("20000000", "4", 240).monthly_payment_cents == 12119607


# --- FR2: totals ---


def test_totals_100k_4pct_20y():
    result = calc("100000", "4", 240)
    assert (result.total_paid_cents, result.total_interest_cents) == (14543520, 4543520)


def test_totals_200k_3_5pct_30y():
    result = calc("200000", "3.5", 360)
    assert (result.total_paid_cents, result.total_interest_cents) == (32331240, 12331240)


def test_totals_typical_250k_4_5pct_25y():
    result = calc("250000", "4.5", 300)
    assert (result.total_paid_cents, result.total_interest_cents) == (41687400, 16687400)


def test_totals_zero_rate_120k_10y():
    result = calc("120000", "0", 120)
    assert (result.total_paid_cents, result.total_interest_cents) == (12000000, 0)


def test_totals_zero_rate_rounds_up_no_interest():
    result = calc("100000", "0", 36)
    assert (result.total_paid_cents, result.total_interest_cents) == (10000000, 0)


def test_totals_zero_rate_rounds_down_not_negative():
    result = calc("1000", "0", 12)
    assert (result.total_paid_cents, result.total_interest_cents) == (100000, 0)


def test_totals_positive_rate_never_negative():
    result = calc("1013", "0.01", 480)
    assert result.monthly_payment_cents == 211
    assert (result.total_paid_cents, result.total_interest_cents) == (101300, 0)


def test_totals_tie_positive_rate_one_month():
    result = calc("1000", "0.03", 1)
    assert (result.total_paid_cents, result.total_interest_cents) == (100003, 3)


def test_totals_max_case():
    result = calc("10000000", "25", 480)
    assert (result.total_paid_cents, result.total_interest_cents) == (10000503360, 9000503360)


def test_totals_one_month_term():
    result = calc("5000", "6", 1)
    assert (result.total_paid_cents, result.total_interest_cents) == (502500, 2500)


# --- module contract: exact annuity payment and errors ---


def test_annuity_payment_exact_value():
    payment = annuity_payment(10_000_000, Fraction(4, 1200), 240)
    assert isinstance(payment, Fraction)
    assert abs(float(payment) - 60598.03292994) < 1e-7


def test_annuity_payment_zero_rate():
    assert annuity_payment(1200, Fraction(0), 12) == Fraction(100)
    assert annuity_payment(1200, 0, 12) == Fraction(100)


def test_payment_rejects_zero_months():
    with pytest.raises(ValueError):
        calculate_loan(10_000_000, 400, 0)


def test_payment_rejects_fractional_months():
    with pytest.raises(ValueError):
        calculate_loan(10_000_000, 400, 12.5)


def test_payment_rejects_negative_rate():
    with pytest.raises(ValueError):
        calculate_loan(10_000_000, -100, 120)


def test_payment_rejects_zero_loan():
    with pytest.raises(ValueError):
        calculate_loan(0, 400, 120)


def test_payment_rejects_not_a_number():
    with pytest.raises(ValueError):
        calculate_loan(float("nan"), 400, 120)
    with pytest.raises(ValueError):
        calculate_loan(10_000_000, float("inf"), 120)
    with pytest.raises(ValueError):
        calculate_loan(True, 400, 120)


def test_annuity_payment_rejects_zero_balance():
    with pytest.raises(ValueError):
        annuity_payment(0, Fraction(3, 1000), 12)


def test_annuity_payment_rejects_bad_rate_and_months():
    with pytest.raises(ValueError):
        annuity_payment(100_000, Fraction(-1, 10), 12)
    with pytest.raises(ValueError):
        annuity_payment(100_000, Fraction(3, 1000), 0)
    with pytest.raises(ValueError):
        annuity_payment(100_000, Fraction(3, 1000), 1.5)
    with pytest.raises(ValueError):
        annuity_payment(100_000, 0.003, 12)


def test_payment_rejects_negative_loan_and_infinite_months():
    with pytest.raises(ValueError):
        calculate_loan(-500, 400, 12)
    with pytest.raises(ValueError):
        calculate_loan(10_000_000, 400, float("inf"))
