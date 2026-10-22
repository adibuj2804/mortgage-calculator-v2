"""Independent reference values for docs/v1/03-test-scenarios.md.

Run: python3 docs/v1/reference-values.py
Uses exact rational arithmetic (fractions.Fraction): no floating point, no rounding until the
final cent. It shares no code with the app.

Rules implemented (docs/v1/01-functional.md):
  payment      = annuity payment, rounded half up to cents (payments at month end)
  rate == 0    -> total paid = loan, total interest = 0.00
  rate  > 0    -> total interest = max(0, rounded payment * months - loan)
                  total paid     = loan + total interest
"""
import math
from fractions import Fraction as F


def half_up(x):
    """Round an exact euro amount half up to cents."""
    return F(math.floor(x * 100 + F(1, 2)), 100)


def reference(loan, rate, months):
    L, n = F(loan), months
    r = F(rate) / 1200
    exact = L / n if r == 0 else L * r * (1 + r) ** n / ((1 + r) ** n - 1)
    pay = half_up(exact)
    raw = pay * n - L
    if r == 0:
        total, interest = L, F(0)
    else:
        interest = max(F(0), raw)
        total = L + interest
    bal = L
    for _ in range(n):
        bal = bal * (1 + r) - exact
    return exact, pay, total, interest, raw, bal


def money(x):
    return f"{float(x):.2f}"


cases = [
    ("standard-100k-4pct-20y", "100000", "4", 240),
    ("standard-200k-3.5pct-30y", "200000", "3.5", 360),
    ("typical-250k-4.5pct-25y", "250000", "4.5", 300),
    ("zero-rate-120k-10y", "120000", "0", 120),
    ("zero-rate-rounds-up", "100000", "0", 36),
    ("zero-rate-rounds-down", "1000", "0", 12),
    ("min-loan-max-rate-1y", "1000", "25", 12),
    ("max-loan-max-rate-max-term", "10000000", "25", 480),
    ("tiny-rate-0.01pct", "100000", "0.01", 120),
    ("one-month-term", "5000", "6", 1),
    ("clamped-1013-0.01pct-40y", "1013", "0.01", 480),
    ("above-v1-maximum-20m", "20000000", "4", 240),
    ("100k-4pct-25y", "100000", "4", 300),
    ("tie-positive-rate-one-month", "1000", "0.03", 1),
]

print("== payment | total paid | total interest | raw interest | exact payment | balance after n months ==")
for name, loan, rate, months in cases:
    exact, pay, total, interest, raw, bal = reference(loan, rate, months)
    print(f"{name}: loan={loan} rate={rate} months={months} payment={money(pay)} "
          f"total={money(total)} interest={money(interest)} raw_interest={money(raw)} "
          f"exact={float(exact):.10f} balance_is_zero={bal == 0}")

print("\n== exact tie cases at 0 % ==")
for name, loan, months in [
    ("tie-half-up-vs-even", "1000.14", 12),
    ("tie-float-hazard", "1000.02", 12),
    ("tie-41.675", "1000.20", 24),
]:
    q = F(loan) / months
    print(f"{name}: loan={loan} months={months} exact={float(q)!r} cents={q * 100} "
          f"half_up={money(half_up(q))} is_tie={(q * 100).denominator == 2}")

print("\n== rounding of the display format ==")
for amount in ["0.005", "0.004", "999.999"]:
    print(f"{amount} -> {money(half_up(F(amount)))}")
