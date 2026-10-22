import random
from dataclasses import astuple

import pytest

from app.calc.payment import calculate_loan
from app.calc.schedule import build_schedule

SEED = 20261022


def standard(loan_cents: int, rate_hundredths: int, months: int):
    regular = calculate_loan(loan_cents, rate_hundredths, months).monthly_payment_cents
    return build_schedule(loan_cents, rate_hundredths, months, regular)


def year(schedule, number: int):
    row = schedule.yearly()[number - 1]
    assert row.year == number
    return astuple(row)[1:]  # paid, interest, principal, end balance


def test_schedule_100k_4pct_20y():
    schedule = standard(10_000_000, 400, 240)
    assert schedule.months == 240
    assert schedule.rows[-1].payment == 60599
    assert schedule.total_payments == 14_543_521
    assert schedule.total_interest == 4_543_521
    assert len(schedule.yearly()) == 20
    assert year(schedule, 1) == (727_176, 393_934, 333_242, 9_666_758)
    assert year(schedule, 20) == (727_177, 15_512, 711_665, 0)


def test_schedule_zero_rate_120k_10y():
    schedule = standard(12_000_000, 0, 120)
    assert schedule.months == 120
    assert schedule.rows[-1].payment == 100_000
    assert (schedule.total_payments, schedule.total_interest) == (12_000_000, 0)
    assert year(schedule, 1) == (1_200_000, 0, 1_200_000, 10_800_000)
    assert year(schedule, 10)[3] == 0


def test_schedule_zero_rate_ends_early():
    regular = calculate_loan(100_080, 0, 480).monthly_payment_cents
    assert regular == 209
    schedule = build_schedule(100_080, 0, 480, regular)
    assert schedule.months == 479
    assert schedule.rows[-1].payment == 178
    assert (schedule.total_payments, schedule.total_interest) == (100_080, 0)
    assert len(schedule.yearly()) == 40
    assert year(schedule, 1) == (2508, 0, 2508, 97_572)
    assert year(schedule, 40) == (2268, 0, 2268, 0)


def test_schedule_one_month_term():
    schedule = standard(500_000, 600, 1)
    assert schedule.months == 1
    assert schedule.rows[0].payment == 502_500
    assert schedule.rows[0].interest == 2500
    assert year(schedule, 1) == (502_500, 2500, 500_000, 0)


def test_schedule_max_loan_max_rate_max_term():
    schedule = standard(1_000_000_000, 2500, 480)
    assert schedule.months == 480
    assert schedule.rows[-1].payment == 20_349_559
    assert schedule.total_payments == 10_000_018_537
    assert schedule.total_interest == 9_000_018_537
    assert year(schedule, 1) == (250_012_584, 249_998_449, 14_135, 999_985_865)
    assert year(schedule, 40) == (249_527_761, 30_699_025, 218_828_736, 0)


def test_schedule_250k_4_5pct_25y():
    schedule = standard(25_000_000, 450, 300)
    assert schedule.months == 300
    assert schedule.rows[-1].payment == 139_027
    assert schedule.total_payments == 41_687_469
    assert schedule.total_interest == 16_687_469
    assert year(schedule, 1) == (1_667_496, 1_113_669, 553_827, 24_446_173)
    assert year(schedule, 25) == (1_667_565, 39_947, 1_627_618, 0)


def test_schedule_random_inputs_keep_the_identities():
    rng = random.Random(SEED)
    for _ in range(300):
        loan = min(max(int(10 ** rng.uniform(5, 9)), 100_000), 1_000_000_000)
        rate = 0 if rng.random() < 0.05 else rng.randint(0, 2500)
        term = rng.randint(1, 480)
        regular = calculate_loan(loan, rate, term).monthly_payment_cents
        schedule = build_schedule(loan, rate, term, regular)
        case = (loan, rate, term)

        assert schedule.rows[-1].balance == 0, case
        assert all(row.balance >= 0 for row in schedule.rows), case
        assert sum(row.principal for row in schedule.rows) == loan, case
        assert schedule.total_payments == loan + schedule.total_interest, case
        assert schedule.months <= term, case
        assert all(row.payment == regular for row in schedule.rows[:-1]), case
        yearly = schedule.yearly()
        assert sum(y.payments_cents for y in yearly) == schedule.total_payments, case
        assert sum(y.interest_cents for y in yearly) == schedule.total_interest, case


def test_schedule_balances_by_year_start_with_the_loan():
    balances = standard(10_000_000, 400, 240).balances_by_year()
    assert len(balances) == 21
    assert balances[0] == 10_000_000
    assert balances[-1] == 0
    assert all(a > b for a, b in zip(balances, balances[1:], strict=False))


def test_schedule_rejects_bad_arguments():
    good = (10_000_000, 400, 240, 60598)
    bad_calls = [
        (0, 400, 240, 60598),
        (10_000_000, -1, 240, 60598),
        (10_000_000, 400, 0, 60598),
        (10_000_000, 400, 240, 0),
        (True, 400, 240, 60598),
    ]
    for args in bad_calls:
        with pytest.raises(ValueError):
            build_schedule(*args)
    with pytest.raises(ValueError):
        build_schedule(*good, extra_cents=-1)
    with pytest.raises(ValueError):
        build_schedule(*good, extra_cents=1.5)


def test_schedule_loop_guard_raises():
    with pytest.raises(RuntimeError):
        build_schedule(100_000, 2500, 12, 1, extra_cents=1)
