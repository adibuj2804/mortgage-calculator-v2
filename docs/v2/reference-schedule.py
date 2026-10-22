"""Independent reference values for the repayment schedule (FR11, FR12) in docs/v2/03-test-scenarios.md.

Run: python3 docs/v2/reference-schedule.py          (prints the scenario values)
     python3 docs/v2/reference-schedule.py json 10000000 400 240 [extra_cents]   (prints the expected "schedule" object)
Exact integer arithmetic only. It shares no code with the app.

Rules (docs/v2/01-functional.md, FR11):
  regular payment P = the V1 rounded payment
  month k = 1..n: interest = round half up (balance * rate / 12 / 100) to the cent
    payment = P, but the loan ends when balance + interest <= P (payment = balance + interest),
    and in month n the payment is balance + interest (the last payment adjusts, the balance ends at 0)
  year y = months 12(y-1)+1 .. 12y (the last year may be shorter)
  with an extra payment (FR6) the payment is min(P + extra, balance + interest) and there is no adjustment
"""
import json
import sys

D = 120000


def regular_payment_cents(loan_c, rate_h, n):
    if rate_h == 0:
        return (2 * loan_c + n) // (2 * n)
    a = D + rate_h
    num = loan_c * rate_h * a**n
    den = D * (a**n - D**n)
    return (2 * num + den) // (2 * den)


def months(loan_c, rate_h, n, extra_c=0):
    """Monthly rows (payment, interest, principal, balance_after)."""
    p = regular_payment_cents(loan_c, rate_h, n)
    bal, rows = loan_c, []
    for k in range(1, n + 13):
        interest = (2 * bal * rate_h + D) // (2 * D)
        owed = bal + interest
        if extra_c == 0:
            pay = owed if (k == n or p >= owed) else p
        else:
            pay = min(p + extra_c, owed)
        bal = owed - pay
        rows.append((pay, interest, pay - interest, bal))
        if bal == 0:
            return rows
    raise AssertionError("loan did not end")


def yearly(rows):
    out = []
    for y in range(0, (len(rows) + 11) // 12):
        chunk = rows[12 * y : 12 * y + 12]
        out.append(
            {
                "year": y + 1,
                "payments_cents": sum(r[0] for r in chunk),
                "interest_cents": sum(r[1] for r in chunk),
                "principal_cents": sum(r[2] for r in chunk),
                "end_balance_cents": chunk[-1][3],
            }
        )
    return out


def balances_by_year(loan_c, rows):
    return [loan_c] + [r["end_balance_cents"] for r in yearly(rows)]


def schedule_object(loan_c, rate_h, n, extra_c=0):
    rows = months(loan_c, rate_h, n)
    obj = {
        "yearly": yearly(rows),
        "total_payments_cents": sum(r[0] for r in rows),
        "total_interest_cents": sum(r[1] for r in rows),
        "extra_balance_by_year_cents": None,
    }
    if extra_c:
        obj["extra_balance_by_year_cents"] = balances_by_year(loan_c, months(loan_c, rate_h, n, extra_c))
    return obj


if len(sys.argv) > 1 and sys.argv[1] == "json":
    loan_c, rate_h, n = (int(x) for x in sys.argv[2:5])
    extra_c = int(sys.argv[5]) if len(sys.argv) > 5 else 0
    print(json.dumps(schedule_object(loan_c, rate_h, n, extra_c)))
    sys.exit(0)

cases = [
    ("schedule-100k-4pct-20y", 10_000_000, 400, 240),
    ("schedule-zero-rate-120k-10y", 12_000_000, 0, 120),
    ("schedule-zero-rate-ends-early", 100_080, 0, 480),
    ("schedule-one-month-term", 500_000, 600, 1),
    ("schedule-max-loan-max-rate-max-term", 1_000_000_000, 2500, 480),
    ("schedule-250k-4.5pct-25y", 25_000_000, 450, 300),
]
for name, loan_c, rate_h, n in cases:
    rows = months(loan_c, rate_h, n)
    y = yearly(rows)
    print(
        f"{name}: loan_c={loan_c} rate_h={rate_h} n={n} regular={regular_payment_cents(loan_c, rate_h, n)} "
        f"months={len(rows)} last_payment={rows[-1][0]} total_payments={sum(r[0] for r in rows)} "
        f"total_interest={sum(r[1] for r in rows)} years={len(y)} year1={y[0]} last_year={y[-1]}"
    )

print("\n== extra balance series: 100000 EUR, 4 %, 240 months, extra 20000 cents ==")
loan_c = 10_000_000
series = balances_by_year(loan_c, months(loan_c, 400, 240, 20_000))
print(len(series), series)
print("standard series length", len(balances_by_year(loan_c, months(loan_c, 400, 240))))
