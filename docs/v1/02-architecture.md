# Mortgage calculator V1: Architecture

Everything here serves the requirements FR1 to FR5 in `01-functional.md`. Nothing beyond V1 is built, but every out-of-scope feature has a named place to go, and the table says honestly how many existing modules it touches.

## Starting point

The repo already has Vite, TypeScript, Vitest, ESLint, Prettier, Husky and commitlint configured (checked). An earlier version with a schedule, extra payments, affordability and a pink UI is saved on branch `archive/pink-redesign`. V1 is rebuilt from this plan: `src/calc/`, `src/ui/`, `src/format/`, `src/main.ts` and `src/styles/main.css` are replaced. `legacy/` and the config files stay.

## Stack

| Tool                    | Use                                | Why (one sentence)                                                            |
| ----------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| TypeScript (strict)     | all source code                    | Types document the module interfaces and catch wrong inputs before tests run. |
| Vite                    | dev server and build               | It is already set up in the repo and starts the app with one command.         |
| Vitest                  | unit tests and end-to-end tests    | One runner for both kinds of tests keeps `npm test` fast.                     |
| jsdom (through Vitest)  | runs the real form without browser | The end-to-end tests need a DOM, and jsdom avoids a browser install.          |
| ESLint, Prettier, Husky | quality gates on commit            | They are already configured and fail a bad commit early.                      |

- Run the tests: `npm test`
- Run the app: `npm run dev`
- Check everything before a push: `npm run lint && npm run typecheck && npm test && npm run build`

## Modules

### 1. `src/calc/payment.ts`

- **Responsibility:** Computes the cost figures of one fixed-rate annuity loan.
- **Interface:**
  - `type LoanInput = { loan: number; annualRatePercent: number; months: number }`
  - `type LoanResult = { monthlyPayment: number; totalPaid: number; totalInterest: number }` (euros, rounded to cents)
  - `calculateLoan(input: LoanInput): LoanResult` applies the rounding and total rules of FR1 and FR2.
  - `annuityPayment(balance: number, monthlyRate: number, months: number): number` is the exact, unrounded annuity payment (a pure building block that a future schedule reuses). A monthly rate of 0 gives balance ÷ months.
- **Errors:** both functions throw a `RangeError` for a non-finite number, a loan or balance of 0 or less, a negative rate, or a number of months below 1 or not a whole number. They do not enforce the V1 maximums, because those belong to module 2. The UI never reaches these errors, they protect future callers such as an API.
- **Rounding:** with a rate of 0 the payment is computed in integer cents (`floor((2·loanCents + months) / (2·months))`), so exact half-cent ties are exact. With a rate above 0 the exact payment is computed in floating point and then rounded half up to cents.
- **Realizes:** FR1, FR2.
- **Depends on:** nothing.

### 2. `src/calc/validate.ts`

- **Responsibility:** Checks the raw text of the three fields.
- **Interface:**
  - `LIMITS`: the single source of the limits (loan 1,000 to 10,000,000, rate 0 to 25, years 1 to 40) used by the checks and the messages.
  - `type RawInputs = { loan: string; rate: string; years: string }`
  - `type FieldErrors = Partial<Record<"loan" | "rate" | "years", string>>`
  - `validateInputs(raw: RawInputs): { ok: true; value: LoanInput } | { ok: false; errors: FieldErrors }`. The valid value already has `months = years × 12`.
- **Realizes:** FR3 (syntax, decimals, range, which message belongs to which field).
- **Depends on:** the `LoanInput` type from module 1 (type-only import, nothing at runtime).

### 3. `src/format/euro.ts`

- **Responsibility:** Turns a number into the euro text shown to the user.
- **Interface:** `formatEuro(amount: number): string`, for example `formatEuro(145435.2)` returns `"145,435.20 €"`. It is built by hand (comma thousands, dot decimals, one regular space, then `€`), not with `Intl`, because `Intl` output differs by locale and uses a no-break space. It rounds to cents. It throws a `RangeError` for a negative or non-finite amount.
- **Realizes:** FR4.
- **Depends on:** nothing.

### 4. `src/ui/form.ts`

- **Responsibility:** Connects the form on the page to the calculation.
- **Interface:** `mountCalculator(root: HTMLElement): void`. It builds the markup below inside `root`.
- **DOM contract** (the end-to-end tests rely on exactly this):

  | Element        | Contract                                                                                                                                                                                     |
  | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | form           | `<form id="calculator" novalidate>`. Pressing Enter in a field submits it, same as the button.                                                                                               |
  | loan field     | `<label for="loan">Loan amount (€)</label>` and `<input id="loan" type="text" inputmode="decimal">`                                                                                          |
  | rate field     | `<label for="rate">Annual interest rate (%)</label>` and `<input id="rate" type="text" inputmode="decimal">`                                                                                 |
  | term field     | `<label for="years">Term (years)</label>` and `<input id="years" type="text" inputmode="numeric">`                                                                                           |
  | error slots    | `<p id="loan-error" role="alert">`, `<p id="rate-error" role="alert">`, `<p id="years-error" role="alert">`. "No error" means the slot's text is empty.                                      |
  | button         | `<button type="submit">Calculate</button>`                                                                                                                                                   |
  | result area    | `<section id="result" aria-live="polite">`. "No result" means it has the `hidden` attribute.                                                                                                 |
  | result figures | `<dd id="result-payment">`, `<dd id="result-total-paid">`, `<dd id="result-total-interest">` with the labels "Monthly payment", "Total paid", "Total interest". Text is `formatEuro` output. |

- **Behaviour:** nothing is calculated until the form is submitted. On submit it calls `validateInputs`. If invalid, it writes each message into its slot, empties the slots of valid fields and hides the result. If valid, it empties all slots, calls `calculateLoan`, writes the three figures through `formatEuro` and shows the result. Editing any field (the `input` event) hides the result (FR5). Messages stay until the next submit.
- **Styling:** `src/styles/main.css`, plain CSS with light and dark colors. It never changes the ids above, and it is not covered by tests.
- **Realizes:** FR1, FR2, FR4 (display), FR3 (messages, clearing the result), FR5.
- **Depends on:** modules 1, 2 and 3.

### 5. `src/main.ts`

- **Responsibility:** Starts the app.
- **Interface:** none. It imports the CSS, finds `#app` in `index.html` and calls `mountCalculator`. If `#app` is missing it throws an `Error("Missing #app element")`.
- **Realizes:** no requirement by itself.
- **Depends on:** module 4.

## Direction of dependencies

```
main  ->  ui/form  ->  calc/payment
                  ->  calc/validate  ..>  calc/payment  (type only)
                  ->  format/euro
```

- Only `ui/form` calls the other modules at runtime. `main` calls only `ui/form`.
- Type-only imports between `calc` modules are allowed (the dotted arrow). They disappear at build time.
- `calc/*` and `format/*` never import from `ui/` and never touch the DOM, `window` or storage.
- No circular dependencies.

## Data model

V1 stores nothing. The three inputs live in the form fields, the result lives in the result area, and a page reload resets both. There is no file, no database and no Supabase table in V1, because saving is out of scope.

## Extension points (one per out-of-scope feature)

"Existing modules changed" counts modules from this document that have to be edited, not modules that are added.

| Feature from "Out of scope V1"      | Added                                                                                                                                                                                             | Existing modules changed                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Amortization schedule               | `calc/schedule.ts` using `annuityPayment`, `ui/scheduleTable.ts`                                                                                                                                  | `ui/form` (mounts the table). Module 1 unchanged.                                                                                   |
| Equal-principal loans               | `calc/equalPrincipal.ts` with its own result type (first payment, last payment, totals), because `LoanResult` has one payment                                                                     | `ui/form` (type selector, different result block)                                                                                   |
| Property price and down payment     | `calc/loanAmount.ts` (price minus down payment)                                                                                                                                                   | `validate` (two fields, a check that the derived loan is within `LIMITS`, new message), `ui/form` (two inputs). Module 1 unchanged. |
| Fees, insurance, property tax       | `calc/costs.ts` (monthly extras)                                                                                                                                                                  | `validate` (new fields), `ui/form` (inputs, extra result lines)                                                                     |
| Extra or early repayments           | `calc/schedule.ts` with its own loop, payoff month and interest saved. FR2's "payment times months" does not apply to it, and it needs a rule for the final payment                               | `validate` (new field, cannot exceed the balance), `ui/form` (input, result lines). Module 1 unchanged.                             |
| Variable or changing rates          | `calc/schedule.ts` calls `annuityPayment(remainingBalance, newMonthlyRate, remainingMonths)` for each rate period, new `RatePeriod` type. Totals come from the schedule, not from `calculateLoan` | `validate` and `ui/form` (period inputs). Module 1 unchanged.                                                                       |
| Comparing two loans                 | nothing in `calc`                                                                                                                                                                                 | `ui/form` mounts two calculators. `calculateLoan` is pure.                                                                          |
| Saving, sharing, export to PDF      | `storage/` or `export/` module called only from `ui/`. This is where a database (Supabase) attaches                                                                                               | `ui/form` (buttons). Calculation unchanged.                                                                                         |
| Other currencies, currency selector | `format/money.ts` replaces `format/euro.ts` with a currency parameter                                                                                                                             | `ui/form` (selector, labels)                                                                                                        |
| Term in months                      | nothing, because `LoanInput` already uses months                                                                                                                                                  | `validate` (unit, limits 12 to 480 months), `ui/form` (label, unit selector). Module 1 unchanged.                                   |
| Decimal comma input                 | nothing                                                                                                                                                                                           | `validate` only (syntax rule)                                                                                                       |

## Decisions

| #   | Decision                                                                 | Reason                                                                                                                   | Alternative considered                                             |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 1   | Plain TypeScript, no UI framework                                        | Three inputs and one result do not justify a framework dependency.                                                       | React or Vue                                                       |
| 2   | Rate 0 is computed in integer cents, rate above 0 in floats then rounded | Half-cent ties at 0 % are exact in integers. At a rate above 0 a tie cannot realistically occur, so floats are enough.   | Floats everywhere with `toFixed(2)` (wrong on ties such as 83.335) |
| 3   | Round half up to cents (written in FR1)                                  | It is the usual reading of "round to cents" on a statement, and now the spec says it.                                    | Banker's rounding (half to even)                                   |
| 4   | Calculation is pure functions with plain-data input and output           | It is testable without a browser and can later sit behind an API (a Python backend in Lesson 5) without touching the UI. | Calculation written inside the button handler                      |
| 5   | `mountCalculator` builds the markup, `index.html` only has `#app`        | The end-to-end tests mount exactly the code that ships.                                                                  | Static form markup in `index.html`                                 |
| 6   | Vitest with jsdom for end-to-end tests                                   | One runner, no browser install, runs inside `npm test`.                                                                  | Playwright (separate runner, browser download)                     |
| 7   | Validation returns messages and never throws                             | The UI always has a message to show next to each field.                                                                  | Throwing an exception per invalid field                            |
| 8   | The calculation takes months, validation converts years to months        | A term in months then needs no change in module 1 (found by the review).                                                 | Years inside `calculateLoan`                                       |
| 9   | `LIMITS` is the single source of the limits                              | Checks and messages cannot disagree.                                                                                     | Numbers repeated in each check and message                         |
| 10  | `formatEuro` is built by hand                                            | The output is the same in every locale and uses a regular space, so the tests can compare exact strings.                 | `Intl.NumberFormat` (locale-dependent, no-break space)             |
| 11  | The DOM contract is part of the architecture                             | Tests are written before the form, so ids, labels and button text must be fixed first (found by the review).             | Letting the implementation choose and adapting the tests           |
| 12  | The 0 % and never-below-0.00 interest rules live in `calculateLoan`      | Every caller, including a future API, gets the same totals.                                                              | Applying them in the UI                                            |
