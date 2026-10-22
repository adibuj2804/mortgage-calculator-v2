# Mortgage calculator V2: Functional scope

V2 is a refactoring into four modules (frontend, API, backend, Supabase), described in `02-architecture.md`. What the user gets stays the same as in V1, plus an extra payment, a repayment schedule with a balance chart, saving, and a saved list. This file lists what is unchanged and what is new. Technology is in `02-architecture.md`, not here.

## Purpose

A user enters a loan amount, an annual interest rate and a term in years, and optionally an extra monthly payment. They get the monthly payment, what the loan costs in total, a yearly repayment schedule with a chart of the remaining balance and, with an extra payment, when the loan ends and how much interest it saves. They can save a calculation and see their saved calculations later.

## Unchanged from V1

FR1 to FR5 of `docs/v1/01-functional.md` stay exactly as they are: the same inputs, rules, limits, examples, error messages and display format. The numbers of FR1 and FR2 must be identical to V1 for every input. Only two things change:

- The calculation and the validation now happen on a server, not in the page. The page shows the messages it receives.
- Field names in messages and requests follow the API: `loan`, `annual_rate_percent`, `term_years`, `extra_monthly_payment`.
- FR5 now covers four fields: editing the extra payment field hides the result like editing any other field.
- "Whitespace" in FR3 and FR6 is exactly what JavaScript's `trim` removes: spaces, tabs, line breaks, the no-break space, the other Unicode space characters (U+1680, U+2000 to U+200A, U+2028, U+2029, U+202F, U+205F, U+3000) and the byte order mark (U+FEFF). The control characters U+001C to U+001F and U+0085 are not whitespace. Leading zeros do not count as digits when the size of a number is checked, so `0000000000000000000001000` is the number 1000.

## New functional requirements

### FR6: Extra monthly payment (optional)

- **Inputs:** the V1 inputs and an optional "extra monthly payment" in euros.
- **Output:** below the V1 result, a block with four figures: the number of months until the loan ends, months saved, total interest with the extra payment, interest saved. The block is shown only when an extra payment above 0 was entered. The V1 result is shown as always and does not change. Numbers of months are written `161 months`, and `1 month` for one.
- **Rules:**
  - The regular payment is the V1 rounded payment.
  - The extra payment is an amount in euros with at most 2 decimals, from 0 to the loan amount. Empty, only whitespace (the same whitespace FR3 ignores), or 0 means no extra payment.
  - The loan is run month by month in cents. Each month: interest = balance × monthly rate, rounded half up to the cent; payment = the smaller of (regular payment + extra payment) and (balance + interest); new balance = balance + interest − payment. The loan ends when the balance is 0.
  - "Months to payoff" is the number of months run. "Total interest with the extra payment" is the sum of that interest.
  - The baseline is the standard repayment schedule of FR11 (the same loop without extra payment). "Months saved" = months of the standard schedule − months to payoff. "Interest saved" = total interest of the standard schedule − total interest with the extra payment. Both are never negative, because paying more can only shorten the loan and lower the interest. The totals of the standard schedule are shown in the schedule table, so the figures add up on screen.
  - The headline result (FR1, FR2) is the V1 result and does not change.
- **Messages for the extra field** (same checks and order as FR3: syntax, decimals, range): `Enter a number`, `Use at most 2 decimals`, `Extra payment must be between 0 and the loan amount`. If there is any error on the loan amount (syntax, decimals or range), the upper bound is 10,000,000 €.
- **Example:** 100,000 €, 4 %, 20 years, extra payment 200 € gives: the loan ends after 161 months, months saved 79, total interest with the extra payment 29,263.29 €, interest saved 16,171.92 €. For 120,000 €, 0 %, 10 years, extra payment 500 €: 80 months, 40 months saved, interest 0.00 €, interest saved 0.00 €. An extra payment equal to the loan (100,000 €, 4 %, 20 years) ends the loan after 1 month with interest 333.33 € and saves 239 months and 45,101.88 €.

### FR7: Save a calculation

- **Inputs:** a result that is on screen, and the user pressing "Save this calculation".
- **Output:** the message `Saved.`, or an error message if saving failed. The result on screen is not changed by either outcome.
- **Rules:**
  - What is stored: the inputs, the V1 result and the extra payment result (if any), a creation time, and a random identifier of this browser (the "client id"). Nothing else: no name, no e-mail, no address. The schedule is not stored.
  - The saved result is calculated again on the server from the inputs. The page never sends a result to be stored.
  - Saving never happens automatically.
  - While a save is running the button is disabled and reads `Saving…`, so a double click saves once. After `Saved.` the button stays disabled and reads `Saved` until there is a new result, so the same result is not saved twice. After a failure the button is enabled again, so the user can retry. A save whose reply was lost on the way can create a second saved item on retry. V2 does not prevent that.
  - If saving fails for any reason (the database or the server cannot be reached, or the server refuses the request) the message is `Could not save right now. Your result is still here.`
  - The message `Saved.` or the failure message is cleared when the user edits a field and when the next calculation starts.
- **Example:** after calculating 100,000 €, 4 %, 20 years, pressing "Save this calculation" shows `Saved.` and the item appears at the top of the saved list.

### FR8: Show saved calculations

- **Inputs:** opening the page, and each successful save.
- **Output:** a list "Saved calculations", newest first, at most 20 items. Each item is one line of text: `<loan> · <rate> % · <years> years · <payment> per month · <date>`, for example `100,000.00 € · 4 % · 20 years · 605.98 € per month · 2026-01-01`.
  - `<loan>` and `<payment>` are euro amounts as in FR4. `<rate>` is the rate with trailing zeros removed (`4`, `4.5`, `3.75`). `<years>` is the term in years, written `1 year` for one. `<date>` is the first 10 characters of the stored creation time (the date in UTC).
- **Rules:**
  - Only calculations saved from this browser (the same client id) are listed.
  - Without saved items the list says `Nothing saved yet.`
  - If the list cannot be loaded (the server or the database cannot be reached, or the server refuses the request) the list area says `Saved calculations are unavailable right now.` and nothing else on the page is affected.
  - The client id is created the first time it is needed and kept in the browser. Clearing the browser data starts a new, empty list.
  - The client id is not a login. Anyone who knows an id can ask for its list. There is no limit on how many items one client can save. V2 has no accounts.
- **Example:** after saving two calculations and reloading the page, both are listed, the newer one first.

### FR9: Keep working when a part is unavailable

- **Inputs:** the server cannot be reached, or the database cannot be reached.
- **Output:** for an unreachable server, the message `Can't reach the calculator. Try again.` under the button. The typed values stay. This message belongs to the calculation request only, and it is cleared when the next calculation starts. For an unreachable database, only saving and the saved list show their messages (FR7, FR8). Calculating works.
- **Rules:** an unreachable server never shows a result. An unreachable database never blocks a calculation. A request that takes longer than 10 seconds counts as unreachable.
- **Example:** with the database down, 100,000 €, 4 %, 20 years still shows 605.98 €, and "Save this calculation" shows `Could not save right now. Your result is still here.`

### FR10: Requests in flight

- **Inputs:** the user presses "Calculate" (or Enter) while a calculation request is still running, or edits a field while a request is running.
- **Output:** while a calculation request is running the button is disabled and reads `Calculating…`. A second submit (button or Enter) is ignored. The button becomes enabled again when that request ends, whatever the outcome. A reply that arrives after the user edited a field is ignored: no result and no messages from it are shown.
- **Rules:** FR5 still holds. A shown result always belongs to the values currently in the fields. When a calculation request starts, the previous result is hidden, so a failed request never leaves an old result on screen. A save reply that arrives after an edit does not change the save message (it was cleared by the edit), but the saved list is still refreshed, because the item was saved.
- **Example:** the user presses Calculate, edits the term, and then the reply arrives. The screen shows no result.

### FR11: Repayment schedule

- **Inputs:** a valid calculation (FR1).
- **Output:** below the result, a table "Repayment schedule" with one row per year: year number, total paid in the year, interest, principal, balance at the end of the year. A last row shows the totals: total paid and total interest of the whole schedule. A note under the table says: `The last payment is adjusted so that the balance ends at exactly 0.00 €. The totals here can differ slightly from the figures above.`
- **Rules:**
  - The loan is run month by month in cents for the V1 term. Each month: interest = balance × monthly rate, rounded half up to the cent. The payment is the regular payment (the V1 rounded payment), but the loan ends as soon as balance + interest is not more than the regular payment, and in the last month of the term the payment is whatever is left. So the balance always ends at exactly 0, and the schedule has at most as many months as the term. Principal = payment − interest.
  - A year covers 12 months. The last year can be shorter.
  - The totals are the sums of the monthly payments and the monthly interest.
  - The schedule is the standard loan. It does not include the extra payment of FR6.
  - The V1 headline (FR2) multiplies the rounded payment by the number of months, so it differs from the schedule totals by the rounding of the last payment. For typical loans this is a few cents. At the extreme (10,000,000 €, 25 %, 40 years) the last payment is 203,495.59 € instead of 208,343.82 €, and the total interest of the schedule is 4,848.23 € lower than the headline. V1 documented this as "ignored". V2 does not change the headline, and shows the real figures in the schedule.
- **Example:** 100,000 €, 4 %, 20 years: 20 rows. Year 1: paid 7,271.76 €, interest 3,939.34 €, principal 3,332.42 €, balance 96,667.58 €. Year 20: paid 7,271.77 €, interest 155.12 €, principal 7,116.65 €, balance 0.00 €. Totals: paid 145,435.21 €, interest 45,435.21 € (the headline says 45,435.20 €). The last payment is 605.99 € instead of 605.98 €. A 1,000.80 €, 0 %, 40 years loan has a regular payment of 2.09 € and ends after 479 months (the last payment is 1.78 €), so its year 40 row covers 11 months.

### FR12: Balance chart

- **Inputs:** a valid calculation (FR1), and if there is an extra payment result (FR6), that too.
- **Output:** a line chart "Remaining balance by year". The line starts at the loan amount at year 0 and shows the balance at the end of each year of the schedule. With an extra payment, a second line shows the balance of the extra payment scenario. The chart has axis labels: `Year 0` and `Year N` (N is the number of years in the schedule) under the plot, the loan amount in the top right corner of the plot and `0.00 €` in its bottom left corner (the lines never pass through these two corners).
- **Rules:** the values come from the same calculation as the table (FR11 for the first line, FR6 for the second). The second line ends at 0 earlier than the first.
- **Example:** 100,000 €, 4 %, 20 years: 21 points, from 100,000.00 € at year 0 to 0.00 € at year 20. With an extra payment of 200 €, the second line has 15 points and reaches 0.00 € at year 14.

## Inputs and limits

| Input                 | Unit        | Allowed values                            |
| --------------------- | ----------- | ----------------------------------------- |
| Loan amount           | €           | 1,000 to 10,000,000, up to 2 decimals     |
| Annual interest rate  | %           | 0 to 25, up to 2 decimals (0 is allowed)  |
| Term                  | whole years | 1 to 40, integer                          |
| Extra monthly payment | €, optional | 0 to the loan amount, up to 2 decimals    |
| Saved list size       | items       | 1 to 50 per request, the page asks for 20 |

## Domain rules

- Everything in "Domain rules" of `docs/v1/01-functional.md` still applies to FR1 and FR2.
- Money between the parts of the system is whole cents. The rate is whole hundredths of a percent.
- The month-by-month loop of FR6 and FR11 is the same calculation, with and without the extra payment.

## Out of scope V2

- User accounts, logging in, deleting or editing saved calculations
- A month-by-month table (the schedule is yearly), export of the schedule
- Deployment to a public server
- Other currencies, a term in months, a decimal comma
- Variable rates, fees, insurance, property tax, comparing two loans, property price and down payment
- Anything that changes the V1 numbers of FR1 and FR2

## Decisions made for V2

1. The frontend stays TypeScript (it runs as JavaScript in the browser).
2. The "API" is a written contract with example files, not a separate running service.
3. Only the backend validates. The page sends the text as typed.
4. Amounts in the API are whole cents.
5. Extra payment savings are measured against the standard repayment schedule, computed by the same loop. (The first plan compared with the V1 headline, but the headline can be thousands of euros off at extreme rates, see FR11.)
6. Saving is a button, and the saved list belongs to a random browser id, not to an account.
7. The database table is created by a SQL file that the owner runs.
8. The backend uses Python 3.12, installed with `uv`.
9. Deployment is not part of V2.
10. The repayment schedule is yearly and is part of the calculation response. It is not stored.

## Open questions

None at the moment.
