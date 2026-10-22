# Mortgage calculator V1: Test scenarios

Each row is one test. The **Test** name is also the test name in the code. Money is exact to the cent. Input format is `loan EUR, rate %, term years`.

Error message wording follows the one example in FR3 (`Enter a number`, `Rate must be between 0 and 25 %`). The other two range messages use the same pattern:

- Loan: `Loan amount must be between 1,000 and 10,000,000 €`
- Term: `Term must be between 1 and 40 years`

## Sources of expected values

| Code | Source                                                                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | `docs/v1/reference-values.py`: Python `Decimal` (60 digits), annuity formula, rounded half up to cents. Totals = rounded payment x months. Run `python3 docs/v1/reference-values.py`. |
| S2   | The same script simulates the balance month by month with the exact payment. It ends at 0.0000000000 for every case, which confirms S1.                                               |
| S3   | Written by hand from the rule or example in `01-functional.md` (FR3, FR4 examples).                                                                                                   |

## Unit tests: `calc/payment.ts` (FR1, FR2)

| Test                               | Level | Module       | Verifies | Input            | Expected output                                                                                                  | Source | Type             |
| ---------------------------------- | ----- | ------------ | -------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------ | ---------------- |
| payment-standard-100k-4pct-20y     | unit  | calc/payment | FR1      | 100000, 4, 20    | payment 605.98                                                                                                   | S1, S2 | happy path       |
| payment-standard-200k-3.5pct-30y   | unit  | calc/payment | FR1      | 200000, 3.5, 30  | payment 898.09                                                                                                   | S1, S2 | happy path       |
| payment-typical-250k-4.5pct-25y    | unit  | calc/payment | FR1      | 250000, 4.5, 25  | payment 1389.58                                                                                                  | S1, S2 | happy path       |
| payment-zero-rate-120k-10y         | unit  | calc/payment | FR1      | 120000, 0, 10    | payment 1000.00                                                                                                  | S1     | boundary (rate)  |
| payment-zero-rate-rounds-up        | unit  | calc/payment | FR1      | 100000, 0, 3     | payment 2777.78 (exact 2777.7777...)                                                                             | S1     | boundary (round) |
| payment-half-cent-rounds-up        | unit  | calc/payment | FR1      | 1000.20, 0, 2    | payment 41.68 (exact value is 41.675, half up)                                                                   | S1     | boundary (round) |
| payment-min-loan-max-rate-1y       | unit  | calc/payment | FR1      | 1000, 25, 1      | payment 95.04                                                                                                    | S1, S2 | boundary         |
| payment-max-loan-max-rate-max-term | unit  | calc/payment | FR1      | 10000000, 25, 40 | payment 208343.82                                                                                                | S1, S2 | boundary         |
| payment-tiny-rate-0.01pct          | unit  | calc/payment | FR1      | 100000, 0.01, 10 | payment 833.75                                                                                                   | S1, S2 | boundary (rate)  |
| totals-100k-4pct-20y               | unit  | calc/payment | FR2      | 100000, 4, 20    | months 240, total paid 145435.20, total interest 45435.20 (not 145435.28, which an unrounded payment would give) | S1     | happy path       |
| totals-200k-3.5pct-30y             | unit  | calc/payment | FR2      | 200000, 3.5, 30  | months 360, total paid 323312.40, total interest 123312.40                                                       | S1     | happy path       |
| totals-typical-250k-4.5pct-25y     | unit  | calc/payment | FR2      | 250000, 4.5, 25  | months 300, total paid 416874.00, total interest 166874.00                                                       | S1     | happy path       |
| totals-zero-rate-no-interest       | unit  | calc/payment | FR2      | 120000, 0, 10    | total paid 120000.00, total interest 0.00                                                                        | S1     | boundary (rate)  |
| totals-max-case                    | unit  | calc/payment | FR2      | 10000000, 25, 40 | total paid 100005033.60, total interest 90005033.60                                                              | S1     | boundary         |
| payment-rejects-zero-term          | unit  | calc/payment | FR1      | 100000, 4, 0     | throws RangeError                                                                                                | S3     | invalid input    |
| payment-rejects-negative-rate      | unit  | calc/payment | FR1      | 100000, -1, 10   | throws RangeError                                                                                                | S3     | invalid input    |
| payment-rejects-zero-loan          | unit  | calc/payment | FR1      | 0, 4, 10         | throws RangeError                                                                                                | S3     | invalid input    |

## Unit tests: `calc/validate.ts` (FR3)

| Test                            | Level | Module        | Verifies | Input (loan, rate, term as typed) | Expected output                                                                               | Source           | Type          |
| ------------------------------- | ----- | ------------- | -------- | --------------------------------- | --------------------------------------------------------------------------------------------- | ---------------- | ------------- |
| validate-valid-typical          | unit  | calc/validate | FR3      | "100000", "4", "20"               | ok, value loan 100000, rate 4, years 20                                                       | S3               | happy path    |
| validate-loan-empty             | unit  | calc/validate | FR3      | "", "4", "20"                     | error on loan only: `Enter a number`                                                          | S3               | invalid input |
| validate-loan-not-numeric       | unit  | calc/validate | FR3      | "abc", "4", "20"                  | error on loan only: `Enter a number`                                                          | S3               | invalid input |
| validate-loan-whitespace-only   | unit  | calc/validate | FR3      | " ", "4", "20"                    | error on loan only: `Enter a number`                                                          | S3               | invalid input |
| validate-decimal-comma-rejected | unit  | calc/validate | FR3      | "100000", "3,75", "20"            | error on rate only: `Enter a number`                                                          | S3               | invalid input |
| validate-loan-below-min         | unit  | calc/validate | FR3      | "999.99", "4", "20"               | error on loan only: `Loan amount must be between 1,000 and 10,000,000 €`                      | S3               | boundary      |
| validate-loan-at-min            | unit  | calc/validate | FR3      | "1000", "4", "20"                 | ok, loan 1000                                                                                 | S3               | boundary      |
| validate-loan-at-max            | unit  | calc/validate | FR3      | "10000000", "4", "20"             | ok, loan 10000000                                                                             | S3               | boundary      |
| validate-loan-above-max         | unit  | calc/validate | FR3      | "10000000.01", "4", "20"          | error on loan only: `Loan amount must be between 1,000 and 10,000,000 €`                      | S3               | boundary      |
| validate-loan-negative          | unit  | calc/validate | FR3      | "-5000", "4", "20"                | error on loan only: `Loan amount must be between 1,000 and 10,000,000 €`                      | S3               | invalid input |
| validate-rate-zero-allowed      | unit  | calc/validate | FR3      | "100000", "0", "20"               | ok, rate 0                                                                                    | S3               | boundary      |
| validate-rate-negative          | unit  | calc/validate | FR3      | "100000", "-0.01", "20"           | error on rate only: `Rate must be between 0 and 25 %`                                         | S3               | boundary      |
| validate-rate-at-max            | unit  | calc/validate | FR3      | "100000", "25", "20"              | ok, rate 25                                                                                   | S3               | boundary      |
| validate-rate-above-max         | unit  | calc/validate | FR3      | "100000", "25.01", "20"           | error on rate only: `Rate must be between 0 and 25 %`                                         | S3               | boundary      |
| validate-term-zero              | unit  | calc/validate | FR3      | "100000", "4", "0"                | error on years only: `Term must be between 1 and 40 years`                                    | S3               | boundary      |
| validate-term-at-bounds         | unit  | calc/validate | FR3      | "100000", "4", "1" and "40"       | ok for both, years 1 and years 40                                                             | S3               | boundary      |
| validate-term-above-max         | unit  | calc/validate | FR3      | "100000", "4", "41"               | error on years only: `Term must be between 1 and 40 years`                                    | S3               | boundary      |
| validate-each-field-own-message | unit  | calc/validate | FR3      | "", "30", "20"                    | errors on loan (`Enter a number`) and rate (`Rate must be between 0 and 25 %`), none on years | S3 (FR3 example) | invalid input |
| validate-all-fields-invalid     | unit  | calc/validate | FR3      | "", "x", ""                       | three errors, each `Enter a number`                                                           | S3               | invalid input |

## Unit tests: `format/euro.ts` (FR4)

| Test                          | Level | Module      | Verifies | Input       | Expected output    | Source | Type       |
| ----------------------------- | ----- | ----------- | -------- | ----------- | ------------------ | ------ | ---------- |
| format-euro-thousands         | unit  | format/euro | FR4      | 145435.2    | `145,435.20 €`     | S3     | happy path |
| format-euro-below-thousand    | unit  | format/euro | FR4      | 605.98      | `605.98 €`         | S3     | happy path |
| format-euro-pads-two-decimals | unit  | format/euro | FR4      | 1000        | `1,000.00 €`       | S3     | boundary   |
| format-euro-zero              | unit  | format/euro | FR4      | 0           | `0.00 €`           | S3     | boundary   |
| format-euro-hundred-millions  | unit  | format/euro | FR4      | 100005033.6 | `100,005,033.60 €` | S3     | boundary   |

## Functional test: modules working together (FR1, FR2, FR3, FR4)

| Test                                  | Level      | Module                                   | Verifies           | Input                        | Expected output                                                                                    | Source | Type       |
| ------------------------------------- | ---------- | ---------------------------------------- | ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------- | ------ | ---------- |
| functional-text-to-euro-100k-4pct-20y | functional | calc/validate, calc/payment, format/euro | FR1, FR2, FR3, FR4 | "100000", "4", "20" as typed | validate ok, then payment text `605.98 €`, total paid `145,435.20 €`, total interest `45,435.20 €` | S1     | happy path |

## End-to-end tests: the real form in jsdom (all requirements)

Each test mounts `mountCalculator` into an empty element, types into the fields, presses the "Calculate" button and reads the page text.

| Test                                   | Level | Module  | Verifies                  | Input (typed, then actions)                                                   | Expected output                                                                                          | Source           | Type          |
| -------------------------------------- | ----- | ------- | ------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------- | ------------- |
| e2e-happy-path-100k-4pct-20y           | e2e   | ui/form | FR1, FR2, FR4             | 100000, 4, 20, press Calculate                                                | page shows `605.98 €`, `145,435.20 €`, `45,435.20 €`, no error messages                                  | S1               | happy path    |
| e2e-zero-rate-120k-10y                 | e2e   | ui/form | FR1, FR2, FR4             | 120000, 0, 10, press Calculate                                                | page shows `1,000.00 €`, `120,000.00 €`, `0.00 €`                                                        | S1               | boundary      |
| e2e-no-result-before-calculate         | e2e   | ui/form | domain rule (button only) | type 100000, 4, 20, do not press Calculate                                    | no result is shown                                                                                       | S3               | happy path    |
| e2e-invalid-shows-messages-no-result   | e2e   | ui/form | FR3                       | "", 30, 20, press Calculate                                                   | `Enter a number` under loan, `Rate must be between 0 and 25 %` under rate, nothing under term, no result | S3 (FR3 example) | invalid input |
| e2e-invalid-after-result-clears-result | e2e   | ui/form | FR3                       | valid 100000, 4, 20, press Calculate, then change rate to 30, press Calculate | the earlier result is gone, the rate message is shown                                                    | S3               | invalid input |
| e2e-fixing-input-clears-messages       | e2e   | ui/form | FR3                       | "", 4, 20, press Calculate, then type 100000, press Calculate                 | the loan message is gone, result shows `605.98 €`                                                        | S3               | invalid input |
