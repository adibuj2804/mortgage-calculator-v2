"""Independent reference values for docs/v1/03-test-scenarios.md.

Run: python3 docs/v1/reference-values.py
Uses Decimal (60 digits) and exact Fractions. It shares no code with the app.

Rules implemented (docs/v1/01-functional.md):
  payment      = annuity payment, rounded half up to cents (payments at month end)
  rate == 0    -> total paid = loan, total interest = 0.00
  rate  > 0    -> total interest = max(0, rounded payment * months - loan)
                  total paid     = loan + total interest
"""
from decimal import Decimal as D, getcontext, ROUND_HALF_UP
from fractions import Fraction

getcontext().prec = 60
CENT = D("0.01")


def round_half_up(x):
    return D(x).quantize(CENT, rounding=ROUND_HALF_UP)


def reference(loan, rate, months):
    L, n = D(loan), months
    r = D(rate) / 12 / 100
    if r == 0:
        exact = L / n
    else:
        exact = L * r / (1 - (1 + r) ** (-n))
    pay = round_half_up(exact)
    raw_interest = pay * n - L
    if r == 0:
        total, interest = L, D("0.00")
    else:
        interest = max(D("0.00"), raw_interest)
        total = L + interest
    bal = L
    for _ in range(n):
        bal = bal * (1 + r) - exact
    return exact, pay, total, interest, raw_interest, bal


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
]

print("== cases: exact payment | payment | total paid | total interest | raw interest | end balance ==")
for name, loan, rate, months in cases:
    exact, pay, total, interest, raw, bal = reference(loan, rate, months)
    print(f"{name}: loan={loan} rate={rate} months={months} exact={exact:.10f} "
          f"payment={pay} total={total} interest={interest} raw_interest={raw} balance={bal:.8f}")

print("\n== exact tie cases (Fraction), payment at 0 % ==")
for name, loan, months in [("tie-half-up-vs-even", "1000.14", 12), ("tie-float-hazard", "1000.02", 12), ("tie-41.675", "1000.20", 24)]:
    q = Fraction(loan) / months
    cents = q * 100
    print(f"{name}: loan={loan} months={months} exact={float(q)!r} cents={cents} "
          f"half_up={round_half_up(D(q.numerator) / D(q.denominator))} "
          f"tie={cents.denominator == 2}")

print("\n== search: smallest-loan rate>0 cases whose raw interest is negative (clamped) ==")
found = 0
for rate in ["0.01", "0.05", "0.1"]:
    for loan in ["1000", "1001", "1500", "2000"]:
        for months in (12, 24, 60, 120, 480):
            exact, pay, total, interest, raw, bal = reference(loan, rate, months)
            if raw < 0 and found < 6:
                found += 1
                print(f"loan={loan} rate={rate} months={months} payment={pay} raw_interest={raw} -> shown interest={interest} total={total}")
