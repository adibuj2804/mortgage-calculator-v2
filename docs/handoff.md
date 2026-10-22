# Handoff

## Done

- Part A: `docs/v1/01` to `05` written, reviewed by an independent subagent (round 1 and 2), plan committed before any V1 code.
- Step 1: `src/format/euro.ts` with its 9 tests. Old out-of-scope code removed from `main` (kept on `archive/pink-redesign`), `jsdom` added.
- Step 2: `src/calc/payment.ts` (`annuityPayment`, `calculateLoan`) with 30 tests (payment, totals, contract).
- Step 3: `src/calc/validate.ts` (`validateInputs`, `LIMITS`) with 31 tests.
- Step 4: 2 functional tests across validate, payment and format.
- Round 2 review fixes: exact `BigInt` rounding of half-cent ties (commit `fix(calc)`), 11 more scenarios, docs 01 to 05 updated (95 scenarios).
- Step 5: `src/ui/form.ts`, `src/main.ts`, `index.html`, `src/styles/main.css` with the 13 e2e tests (jsdom).

## Next

- Step 6: verification (test-name traceability check, real browser check, independent recompute, README, retro) and final push.

## Open questions

- None.
