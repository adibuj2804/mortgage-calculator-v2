import random

import pytest

from app.calc.extra import calculate_extra
from app.calc.payment import calculate_loan
from app.calc.schedule import Month, Schedule, build_schedule

SEED = 20261022


def run(loan: int, rate: int, term: int, extra: int):
    regular = calculate_loan(loan, rate, term).monthly_payment_cents
    base = build_schedule(loan, rate, term, regular)
    scenario = build_schedule(loan, rate, term, regular, extra_cents=extra)
    return calculate_extra(base, scenario)


def summary(result):
    return (
        result.months_to_payoff,
        result.total_interest_cents,
        result.months_saved,
        result.interest_saved_cents,
    )


def test_extra_standard_100k_4pct_20y_200():
    assert summary(run(10_000_000, 400, 240, 20_000)) == (161, 2_926_329, 79, 1_617_192)


def test_extra_zero_rate_120k_10y_500():
    assert summary(run(12_000_000, 0, 120, 50_000)) == (80, 0, 40, 0)


def test_extra_equals_loan_pays_off_in_one_month():
    assert summary(run(10_000_000, 400, 240, 10_000_000)) == (1, 33_333, 239, 4_510_188)


def test_extra_tiny_saves_no_months():
    assert summary(run(10_000_000, 400, 240, 1)) == (240, 4_543_404, 0, 117)


def test_extra_small_loan_high_rate():
    assert summary(run(100_000, 1200, 12, 5000)) == (8, 4320, 4, 2299)


def test_extra_typical_250k_4_5pct_25y_1000():
    assert summary(run(25_000_000, 450, 300, 100_000)) == (134, 6_800_823, 166, 9_886_646)


def test_extra_max_loan_max_rate_max_term():
    result = run(1_000_000_000, 2500, 480, 100_000_000)
    assert summary(result) == (10, 109_179_241, 470, 8_890_839_296)


def test_extra_balance_series_100k_4pct_20y_200():
    # fmt: off
    expected = [
        10_000_000, 9_422_308, 8_821_082, 8_195_361, 7_544_145, 6_866_399, 6_161_041, 5_426_945,
        4_662_940, 3_867_809, 3_040_283, 2_179_042, 1_282_714, 349_867, 0,
    ]
    # fmt: on
    assert run(10_000_000, 400, 240, 20_000).balances_by_year_cents == expected


def test_extra_savings_never_negative_on_random_inputs():
    rng = random.Random(SEED)
    for _ in range(300):
        loan = min(max(int(10 ** rng.uniform(5, 9)), 100_000), 1_000_000_000)
        rate = 0 if rng.random() < 0.05 else rng.randint(0, 2500)
        term = rng.randint(1, 480)
        extra = rng.randint(1, loan)
        regular = calculate_loan(loan, rate, term).monthly_payment_cents
        base = build_schedule(loan, rate, term, regular)
        scenario = build_schedule(loan, rate, term, regular, extra_cents=extra)
        result = calculate_extra(base, scenario)
        case = (loan, rate, term, extra)
        assert result.months_saved >= 0, case
        assert result.interest_saved_cents >= 0, case
        assert result.months_to_payoff <= base.months, case


def test_extra_rejects_a_longer_extra_schedule():
    short = Schedule(100, (Month(101, 1, 100, 0),))
    long = Schedule(100, (Month(51, 1, 50, 50), Month(51, 1, 50, 0)))
    costly = Schedule(100, (Month(110, 10, 100, 0),))
    with pytest.raises(ValueError):
        calculate_extra(short, long)
    with pytest.raises(ValueError):
        calculate_extra(short, costly)


def test_extra_rejects_negative_extra():
    with pytest.raises(ValueError):
        build_schedule(10_000_000, 400, 240, 60598, extra_cents=-1)


def test_extra_rejects_non_whole_cents():
    with pytest.raises(ValueError):
        build_schedule(10_000_000, 400, 240, 60598, extra_cents=1.5)
