# Mortgage calculator V1: Architecture

Everything here serves the requirements FR1 to FR4 in `01-functional.md`. Nothing beyond V1 is built, but every out-of-scope feature has a named place to go.

## Stack

| Tool                    | Use                                | Why (one sentence)                                                                |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| TypeScript (strict)     | all source code                    | Types document the module interfaces and catch wrong inputs before the tests run. |
| Vite                    | dev server and build               | It is already set up in the repo and starts the app with one command.             |
| Vitest                  | unit tests and end-to-end tests    | One runner for both kinds of tests keeps `npm test` fast.                         |
| jsdom (through Vitest)  | runs the real form without browser | The end-to-end test needs a DOM, and jsdom avoids a browser install.              |
| ESLint, Prettier, Husky | quality gates on commit            | They are already configured and fail a bad commit early.                          |

- Run the tests: `npm test`
- Run the app: `npm run dev`
- Check everything before a push: `npm run lint && npm run typecheck && npm test && npm run build`

## Modules

### 1. `src/calc/payment.ts`

- **Responsibility:** Computes the cost figures of one fixed-rate annuity loan.
- **Interface:**
  - `type LoanInput = { loan: number; annualRatePercent: number; years: number }`
  - `type LoanResult = { months: number; monthlyPayment: number; totalPaid: number; totalInterest: number }`
  - `calculateLoan(input: LoanInput): LoanResult` (all money values are euros rounded to cents)
- **Realizes:** FR1, FR2.
- **Depends on:** nothing.

### 2. `src/calc/validate.ts`

- **Responsibility:** Checks the raw text of the three fields against the limits.
- **Interface:**
  - `type RawInputs = { loan: string; rate: string; years: string }`
  - `type FieldErrors = Partial<Record<"loan" | "rate" | "years", string>>`
  - `validateInputs(raw: RawInputs): { ok: true; value: LoanInput } | { ok: false; errors: FieldErrors }`
- **Realizes:** FR3 (which message belongs to which field).
- **Depends on:** the `LoanInput` type from module 1, nothing at runtime.

### 3. `src/format/euro.ts`

- **Responsibility:** Turns a number into the euro text shown to the user.
- **Interface:** `formatEuro(amount: number): string`, for example `formatEuro(145435.2)` returns `"145,435.20 €"`.
- **Realizes:** FR4.
- **Depends on:** nothing.

### 4. `src/ui/form.ts`

- **Responsibility:** Connects the form on the page to the calculation.
- **Interface:** `mountCalculator(root: HTMLElement): void`. It builds the three fields, the "Calculate" button, the error slots and the result area inside `root`.
- **Behaviour:** nothing is calculated until "Calculate" is pressed. On press it calls `validateInputs`. If the inputs are invalid it shows each message next to its field and clears any earlier result. If they are valid it calls `calculateLoan` and shows the figures through `formatEuro`.
- **Realizes:** FR3 (display of the messages and clearing of the result), and the display side of FR1, FR2, FR4.
- **Depends on:** modules 1, 2 and 3.

### 5. `src/main.ts`

- **Responsibility:** Starts the app.
- **Interface:** none. It finds `#app` in `index.html` and calls `mountCalculator`.
- **Realizes:** no requirement by itself.
- **Depends on:** module 4.

## Direction of dependencies

```
main  ->  ui/form  ->  calc/payment
                  ->  calc/validate  (type only from calc/payment)
                  ->  format/euro
```

- Only `ui/form` may call the other modules. `main` may call only `ui/form`.
- `calc/*` and `format/*` never import from `ui/` and never touch the DOM, `window` or storage.
- No circular dependencies.

## Data model

V1 stores nothing. The three inputs live in the form fields, the result lives in the result area, and a page reload resets both. There is no file, no database and no Supabase table in V1, because saving is out of scope.

## Extension points (one per out-of-scope feature)

| Feature from "Out of scope V1"      | What is added or changes                                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amortization schedule               | New `calc/schedule.ts` reads `monthlyPayment` and `months` from module 1, new `ui/scheduleTable.ts` shows it. `ui/form.ts` mounts the table.       |
| Equal-principal loans               | New `calc/equalPrincipal.ts` with the same result shape. `ui/form.ts` gets a loan-type selector.                                                   |
| Property price and down payment     | New `calc/loanAmount.ts` (price minus down payment). `ui/form.ts` gets two inputs, `validate.ts` gets two entries for them. Calculation unchanged. |
| Fees, insurance, property tax       | New `calc/costs.ts` adds monthly extras to the payment. `ui/form.ts` shows the extra lines.                                                        |
| Extra or early repayments           | `calc/schedule.ts` takes an optional extra payment per month. Module 1 is unchanged.                                                               |
| Variable or changing rates          | `calc/schedule.ts` takes a list of rate periods and reuses the annuity formula from module 1 for the remaining balance of each period.             |
| Comparing two loans                 | `ui/form.ts` mounts two calculators. Module 1 is unchanged because `calculateLoan` is a pure function.                                             |
| Saving, sharing, export to PDF      | New `storage/` or `export/` module called only from `ui/`. This is where a database (Supabase) would attach. Calculation unchanged.                |
| Other currencies, currency selector | `format/euro.ts` becomes `format/money.ts` with a currency parameter. `ui/form.ts` gets the selector.                                              |
| Term in months, decimal comma input | Only `validate.ts` changes (new parsing rules).                                                                                                    |

## Decisions

| #   | Decision                                                               | Reason                                                                                                                   | Alternative considered                         |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 1   | Plain TypeScript, no UI framework                                      | Three inputs and one result do not justify a framework dependency.                                                       | React or Vue                                   |
| 2   | Money is handled as integer cents inside `calc/payment.ts`             | Totals are payment times months, and integer cents avoid floating-point cent errors.                                     | Euros as floats with `toFixed(2)`              |
| 3   | Round half up to cents                                                 | It matches how the independent reference script rounds and how a bank statement reads.                                   | Banker's rounding (half to even)               |
| 4   | Calculation is pure functions with plain-data input and output         | It is testable without a browser and can later sit behind an API (a Python backend in Lesson 5) without touching the UI. | Calculation written inside the button handler  |
| 5   | `mountCalculator` builds the form markup, `index.html` only has `#app` | The end-to-end test mounts exactly the code that ships.                                                                  | Static form markup in `index.html`             |
| 6   | Vitest with jsdom for end-to-end tests                                 | One runner, no browser install, runs inside `npm test`.                                                                  | Playwright (separate runner, browser download) |
| 7   | Validation returns messages and never throws                           | The UI always has a message to show next to each field.                                                                  | Throwing an exception per invalid field        |
