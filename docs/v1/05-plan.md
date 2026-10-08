# Plan: student-friendly pink redesign

Goal: turn the basic calculator into a richer, student-friendly tool with a pink theme.
Every step is test-first where logic is involved and ends in one commit.

## Steps

1. **Calc: input validation fixes** — reject terms that round to zero payments and negative
   interest rates instead of silently coercing them.
2. **Calc: amortization schedule** — month-by-month balance, yearly summary rows.
3. **Calc: extra monthly payment** — payoff time and interest saved versus the plain loan.
4. **Calc: affordability** — payment-to-income ratio with a comfortable / tight / risky verdict.
5. **UI: pink theme** — light and dark palettes, rounded friendly styling.
6. **UI: new features** — monthly income, extra payment, scenario presets, balance-over-time
   chart, yearly schedule table, plain-English glossary. Errors clear stale results.
7. **Verify and push** — tests, lint, typecheck, build, browser check, push.

## Out of scope

Variable rates, fees, insurance, taxes, persistence.
