# Mortgage calculator

A one-page mortgage calculator. The user enters a loan amount, a yearly interest rate and a term in years, presses "Calculate", and gets the monthly payment, the total paid and the total interest of a fixed-rate annuity loan, in euros and exact to the cent.

The project was built plan-first. The plan (functional spec, architecture, test scenarios, independent review, step-by-step plan, retro and the prompts used) lives in [`docs/v1/`](docs/v1/).

## Run it

Needs Node 22.18 or newer (Node 24 recommended).

```bash
npm install
npm run dev
```

Open the address that Vite prints (usually <http://localhost:5173>).

## Checks

| Command                   | What it does                                                                     |
| ------------------------- | -------------------------------------------------------------------------------- |
| `npm test`                | runs all 95 tests (unit, functional and end-to-end through the form, in jsdom)   |
| `npm run check:scenarios` | checks that every scenario in `docs/v1/03-test-scenarios.md` is a test, and back |
| `npm run lint`            | ESLint                                                                           |
| `npm run typecheck`       | TypeScript, strict                                                               |
| `npm run build`           | type check and production build into `dist/`                                     |

## How it is built

```
src/
  calc/payment.ts    monthly payment and totals (exact integer rounding)
  calc/validate.ts   checks the raw text of the three fields
  format/euro.ts     "145,435.20 €"
  ui/form.ts         the form, wired to the modules above
  main.ts            starts the app
docs/
  handoff.md         where the work stands
  v1/                01 functional, 02 architecture, 03 test scenarios, 04 review,
                     05 plan, 06 retro, prompts.md, reference-values.py
```

The numbers in the tests do not come from the code. `docs/v1/reference-values.py` computes them with exact fractions: `python3 docs/v1/reference-values.py`.

## Branches

- `main`: V1, built from `docs/v1/05-plan.md`.
- `archive/pink-redesign`: an earlier, larger version (schedule, extra payments, affordability, pink theme) whose scope went beyond the approved V1 functional definition. Kept for reference, see `docs/v1/06-retro.md`.
