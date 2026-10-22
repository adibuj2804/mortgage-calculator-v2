"""Independent reference values for the extra payment scenarios in docs/v2/03-test-scenarios.md.

Run: python3 docs/v2/reference-extra.py
Exact integer arithmetic only (no floating point). It shares no code with the app.

Rules (docs/v2/01-functional.md, FR6):
  regular payment = the V1 rounded annuity payment (half up, exact)
  every month: interest = round half up (balance * rate / 12 / 100) to the cent
               payment  = min(regular + extra, balance + interest)
               balance  = balance + interest - payment
  months_to_payoff = months the loop runs, total interest = sum of the interest
  the baseline is the standard repayment schedule (FR11): the same loop with no extra payment, where the
  payment is the regular payment, the loan ends when it is paid, and in the last month of the term the
  payment is whatever is left
  months_saved     = max(0, baseline months - months_to_payoff)
  interest_saved   = max(0, baseline total interest - total interest)
"""

D = 120000  # monthly rate = annual rate in hundredths of a percent / 120000


def regular_payment_cents(loan_c, rate_h, n):
    if rate_h == 0:
        return (2 * loan_c + n) // (2 * n)
    a = D + rate_h
    num = loan_c * rate_h * a**n
    den = D * (a**n - D**n)
    return (2 * num + den) // (2 * den)


def baseline(loan_c, rate_h, n):
    """The standard schedule: (months, total interest)."""
    p = regular_payment_cents(loan_c, rate_h, n)
    bal, interest_total = loan_c, 0
    for k in range(1, n + 1):
        interest = (2 * bal * rate_h + D) // (2 * D)
        owed = bal + interest
        pay = owed if (k == n or p >= owed) else p
        bal = owed - pay
        interest_total += interest
        if bal == 0:
            return k, interest_total
    raise AssertionError("schedule did not end")


def simulate(loan_c, rate_h, n, extra_c):
    pay = regular_payment_cents(loan_c, rate_h, n)
    bal, months, interest_total = loan_c, 0, 0
    while bal > 0:
        interest = (2 * bal * rate_h + D) // (2 * D)
        paid = min(pay + extra_c, bal + interest)
        bal += interest - paid
        interest_total += interest
        months += 1
        assert months <= n + 12, "loop did not end"
    return months, interest_total


cases = [
    ("extra-standard-100k-4pct-20y-200", 10_000_000, 400, 240, 20_000),
    ("extra-zero-rate-120k-10y-500", 12_000_000, 0, 120, 50_000),
    ("extra-equals-loan-pays-off-in-one-month", 10_000_000, 400, 240, 10_000_000),
    ("extra-tiny-saves-no-months", 10_000_000, 400, 240, 1),
    ("extra-small-loan-high-rate", 100_000, 1200, 12, 5_000),
    ("extra-typical-250k-4.5pct-25y-1000", 25_000_000, 450, 300, 100_000),
    ("extra-max-loan-max-rate-max-term", 1_000_000_000, 2500, 480, 100_000_000),
    ("extra-savings-never-negative", 101_300, 1, 480, 1),
    ("extra-interest-saved-clamped-when-higher", 126_714_242, 1, 372, 1),
]

for name, loan_c, rate_h, n, extra_c in cases:
    pay = regular_payment_cents(loan_c, rate_h, n)
    base_months, base_interest = baseline(loan_c, rate_h, n)
    months, interest = simulate(loan_c, rate_h, n, extra_c)
    print(
        f"{name}: loan_c={loan_c} rate_h={rate_h} term={n} extra_c={extra_c} "
        f"regular={pay} baseline_months={base_months} baseline_interest={base_interest} -> "
        f"months_to_payoff={months} total_interest={interest} "
        f"months_saved={max(0, base_months - months)} "
        f"interest_saved={max(0, base_interest - interest)} raw_interest_saved={base_interest - interest}"
    )
