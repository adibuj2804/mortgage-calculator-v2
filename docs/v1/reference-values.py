from decimal import Decimal as D, getcontext, ROUND_HALF_UP

getcontext().prec = 60
CENT = D("0.01")

cases = [
    ("A", "100000", "4", 20),
    ("B", "200000", "3.5", 30),
    ("C", "120000", "0", 10),
    ("D", "100000", "0", 3),
    ("E", "1000.20", "0", 2),
    ("F", "1000", "25", 1),
    ("G", "10000000", "25", 40),
    ("H", "100000", "0.01", 10),
    ("I", "250000", "4.5", 25),
    ("J", "1000", "0", 40),
]

for name, loan, rate, years in cases:
    L, n = D(loan), years * 12
    r = D(rate) / 12 / 100
    exact = L / n if r == 0 else L * r / (1 - (1 + r) ** (-n))
    pay = exact.quantize(CENT, rounding=ROUND_HALF_UP)
    total = pay * n
    interest = total - L
    bal = L
    for _ in range(n):
        bal = bal * (1 + r) - exact
    print(f"{name}: loan={loan} rate={rate}% years={years} n={n} "
          f"exact={exact:.8f} payment={pay} total={total} interest={interest} "
          f"balance_after_n={bal:.10f}")
