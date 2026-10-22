# Handoff

## Done

- Part A: `docs/v1/01` to `05` written, reviewed by an independent subagent (round 1 and 2), plan committed before any V1 code.
- Step 1: `src/format/euro.ts` with its 9 tests. Old out-of-scope code removed from `main` (kept on `archive/pink-redesign`), `jsdom` added.
- Step 2: `src/calc/payment.ts` (`annuityPayment`, `calculateLoan`) with 30 tests (payment, totals, contract).
- Step 3: `src/calc/validate.ts` (`validateInputs`, `LIMITS`) with 31 tests.
- Step 4: 2 functional tests across validate, payment and format.

## Next

- Step 5: `src/ui/form.ts`, `src/main.ts`, `index.html`, `src/styles/main.css` with the 11 e2e tests (jsdom).

## Open questions

- None.
