# Mortgage calculator V1: Plan

This is the only file the build session needs. It says what to build, in which order, and when it is done. Details are in `01-functional.md` (what), `02-architecture.md` (modules and DOM contract), `03-test-scenarios.md` (the tests, by name). The review is in `04-review.md`.

## 1. Goals of V1

Each goal can be ticked yes or no at the end.

1. A user enters loan amount, rate and term, presses "Calculate", and sees monthly payment, total paid and total interest, exact to the cent (100,000 €, 4 %, 20 years gives 605.98 €, 145,435.20 €, 45,435.20 €).
2. Invalid input never produces a result, and every invalid field shows its own message.
3. All 83 scenarios in `03-test-scenarios.md` exist as automated tests and pass.
4. The app starts with one command (`npm run dev`) and the README says how.

## 2. Scope

- In: FR1 to FR5 from `01-functional.md`, including the rules added by the review (half-up rounding, 0 % loans have no interest, interest never below 0.00, strict input syntax, FR5 hide stale result).
- Out: everything in "Out of scope V1" in `01-functional.md`. The previous feature set (schedule, extra payments, affordability, pink UI) is on branch `archive/pink-redesign` and is not part of V1.
- Changes after the review are in `01` to `03` and listed in `04-review.md`. Nothing in this plan contradicts them.

## 3. Acceptance criteria

### Functional: tests that must pass

Test names are exactly the names in `03-test-scenarios.md`. A criterion without a test does not exist.

| Group                                    | Test names (prefix in `03`)                                                                                                                                                              | Rows   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Monthly payment (FR1)                    | `payment-standard-*`, `payment-typical-*`, `payment-zero-rate-*`, `payment-tie-*`, `payment-min-*`, `payment-max-*`, `payment-tiny-*`, `payment-one-month-term`, `payment-no-v1-maximum` | 13     |
| Totals (FR2)                             | `totals-*`                                                                                                                                                                               | 9      |
| Module 1 contract                        | `annuity-payment-*`, `payment-rejects-*`                                                                                                                                                 | 8      |
| Validation (FR3)                         | `validate-*`                                                                                                                                                                             | 31     |
| Display format (FR4)                     | `format-euro-*`                                                                                                                                                                          | 9      |
| Modules together                         | `functional-*`                                                                                                                                                                           | 2      |
| End to end through the form (FR1 to FR5) | `e2e-*`                                                                                                                                                                                  | 11     |
| **Total**                                |                                                                                                                                                                                          | **83** |

### Technical

- `npm test` passes with no failing and no skipped tests.
- `npm run lint`, `npm run typecheck` and `npm run build` pass.
- Every test name from `03` appears as a test title in `src/` (checked by the script in step 6).
- `npm run dev` starts the app, and `README.md` describes how to start it and how to run the tests.

## 4. Build order

Order follows the dependencies in `02-architecture.md`: first the modules nothing depends on. One step is one module and one session. In every step: write the tests of that module first, run them and see them fail, then implement, then commit.

| Step | Module                                                               | Tests that must pass                   | Commit message                                    |
| ---- | -------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------- |
| 1    | `src/format/euro.ts`                                                 | the 9 `format-euro-*` tests            | `feat(format): add euro formatter`                |
| 2    | `src/calc/payment.ts`                                                | 13 payment, 9 totals, 8 contract tests | `feat(calc): add annuity payment and loan totals` |
| 3    | `src/calc/validate.ts`                                               | the 31 `validate-*` tests              | `feat(calc): add input validation`                |
| 4    | (no new module) functional tests                                     | the 2 `functional-*` tests             | `test: add functional tests across modules`       |
| 5    | `src/ui/form.ts`, `src/main.ts`, `index.html`, `src/styles/main.css` | the 11 `e2e-*` tests                   | `feat(ui): add calculator form`                   |
| 6    | verification and push                                                | everything above                       | `docs: finish V1 verification`                    |

Before step 1 the old code (`src/calc`, `src/ui`, `src/format.ts`, `src/main.ts`, `src/styles`) is removed from `main`. It stays available on `archive/pink-redesign`. Step 1 starts with that removal and the jsdom dev dependency.

Environment facts for the build:

- Remote `origin` is `https://github.com/adibuj2804/mortgage-calculator-v2`, branch `main`. Every commit is pushed to `main`. The old code is already pushed on `archive/pink-redesign`.
- Vite, TypeScript, Vitest, ESLint, Prettier, Husky and commitlint are installed and configured. The only dependency added is `jsdom` (a dev dependency, so `package.json` and `package-lock.json` change in step 1).
- `docs/handoff.md` has the sections Done, Next and Open questions. Each step adds one line to Done and moves Next.
- `.claude/` and `.playwright-mcp/` are local tool folders and are never committed.

## 5. Definition of done for each step

- The tests of this module are green.
- The tests of all earlier steps are still green.
- Lint, formatting and type check pass (the Husky pre-commit hook enforces this).
- One commit with the message from the table, pushed to GitHub.
- `docs/handoff.md` lists the step under "Done" and the next step under "Next".

Step 6 is done when every item in section 3 is ticked and the app was checked once in a real browser (inputs, "Calculate", one invalid input, one edit after a result).

## 6. Tools used during the build

- **Husky pre-commit hook** (lint-staged: ESLint and Prettier) and **commitlint**: already configured. They block a commit that breaks the rules. Reason: it makes "tests, lint and format are fine" automatic instead of a thing to remember.
- **Vitest watch run and jsdom**: tests-first loop and the end-to-end tests without a browser.
- **Subagent with a clean context**: used for the plan review (done). It is also used in step 6 to recompute the result of `calculateLoan` for the reference inputs with its own script, so the check does not depend on the code that wrote the numbers.
- **`docs/handoff.md`**: the hand-over between sessions, updated at the end of each step.
- **Real browser check** in step 6 (the built-in browser pane): the only thing jsdom cannot show is how the page looks.

## 7. Risks and open questions

| Risk                                                                  | What we do                                                                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Floating-point error on half-cent ties                                | Rate 0 uses integer cents, and two tie tests (`payment-tie-*`) fail on a float implementation.                    |
| The e2e tests depend on the DOM contract, so a changed id breaks them | The contract is in `02-architecture.md`. If it must change, change the document first, then tests, then code.     |
| jsdom does not do real layout or Enter-key implicit submission        | The Enter test submits the form the way Enter does; the browser check in step 6 presses Enter once for real.      |
| The plan itself is wrong in a place we did not see                    | Fix the file in `docs/v1/` first, write the reason in `06-retro.md`, then change the code. Never bypass the plan. |
| Open questions                                                        | None at the moment.                                                                                               |
