# Mortgage calculator V1: Functional scope

## Purpose

A user enters a loan amount, an annual interest rate and a term in years. They get the monthly payment and what the loan costs in total. V1 does one calculation for one fixed-rate annuity loan.

## Functional requirements

### FR1: Calculate the monthly payment

- **Inputs:** loan amount, annual interest rate, term in years. The user presses "Calculate" or presses Enter in a field.
- **Output:** the monthly payment.
- **Rules:**
  - It is an annuity: the same payment every month, paid at the end of each month.
  - The payment is rounded to cents, half up (an exact half cent rounds up: 83.325 becomes 83.33).
  - If the rate is 0 %, the payment is loan amount ÷ number of months, rounded to cents.
- **Example:** 100,000 €, 4 %, 20 years gives a payment of **605.98 €**. For 200,000 €, 3.5 %, 30 years the payment is **898.09 €**. For 120,000 €, 0 %, 10 years it is **1,000.00 €**. For 1,000.14 €, 0 %, 1 year the exact payment is 83.345, so it is **83.35 €** (half up). For 1,000 €, 0.03 %, 1 month the exact payment is 1,000.025, so it is **1,000.03 €**.

### FR2: Show total paid and total interest

- **Inputs:** same as FR1.
- **Output:** total paid and total interest.
- **Rules:**
  - If the rate is 0 %: total paid = loan amount and total interest = 0.00. A loan with no interest has no interest, even when the rounded payments add up to a few cents more or less.
  - If the rate is above 0 %: total interest = rounded monthly payment × number of months − loan amount, but never below 0.00. Total paid = loan amount + total interest. Normally this is the same as rounded payment × number of months.
- **Example:** 100,000 €, 4 %, 20 years gives total paid **145,435.20 €** (605.98 × 240) and total interest **45,435.20 €**. For 120,000 €, 0 %, 10 years, total interest is **0.00 €**. For 100,000 €, 0 %, 3 years the payment is 2,777.78 €, total paid is 100,000.00 € and total interest is 0.00 € (not 0.08 €). For 1,013 €, 0.01 %, 40 years the payment is 2.11 €, and 2.11 × 480 = 1,012.80 is below the loan, so total interest is **0.00 €** and total paid is **1,013.00 €**.

### FR3: Validate inputs

- **Inputs:** the three fields as typed.
- **Output:** a message next to each invalid field, and no result.
- **Rules (checked in this order, the first failing check gives the message):**
  1. **Syntax.** Leading and trailing whitespace is ignored (spaces, tabs, line breaks and the no-break space). What remains must be ASCII digits with an optional minus sign at the start and an optional decimal part after a dot (`100000`, `3.75`, `-5`, `007`). Anything else shows "Enter a number": empty, spaces only, letters, `1e3`, `Infinity`, `NaN`, `.5`, `5.`, `+5`, `0x10`, `1,000`, `1 000`, `3,75`, `1.2.3`, a lone `-`, `--5`, `- 5`, and non-ASCII digits or a Unicode minus. The text `-0` is read as 0.
  2. **Decimals.** Loan amount and rate may have at most 2 decimals, otherwise "Use at most 2 decimals" (`1000.005`, `4.005`). Trailing zeros do not count (`1000.500` is fine). The term must be a whole number, otherwise "Term must be a whole number" (`20.5`). The text `20.0` is the whole number 20.
  3. **Range.** A value outside the limits shows the allowed range: "Loan amount must be between 1,000 and 10,000,000 €", "Rate must be between 0 and 25 %", "Term must be between 1 and 40 years".
  - Messages use a regular space before `%` and `€`. A number with hundreds of digits is a number, so it gets the range message.
  - Each invalid field shows its own message. A message stays until "Calculate" is pressed again, even when a field is edited in between (editing only hides the result, see FR5).
  - If the inputs are invalid when "Calculate" is pressed after a result was shown, the result is cleared.
- **Example:** loan amount empty, rate 30, term 20 shows "Enter a number" under loan amount and "Rate must be between 0 and 25 %" under rate. No result is shown. A rate of `25.001` shows "Use at most 2 decimals", not the range message.

### FR4: Display format

- **Inputs:** the calculated results.
- **Output:** amounts in euros with a comma as thousands separator, a dot before 2 decimals, and the € sign after one regular space (U+0020).
- **Rules:** the currency is € only, and there is no selector. Amounts are always shown with exactly 2 decimals. The amounts given to the display are already whole cents. Any extra precision is rounded half up to the cent (0.005 is shown as `0.01 €`, 0.004 as `0.00 €`, 999.999 as `1,000.00 €`).
- **Example:** `145,435.20 €`, `605.98 €`, `0.00 €`.

### FR5: Keep the result in step with the inputs

- **Inputs:** an edit of any of the three fields while a result is shown.
- **Output:** the result is hidden until "Calculate" is pressed again.
- **Rules:** a shown result always belongs to the values currently in the fields. Nothing is recalculated while typing.
- **Example:** result shown for 100,000 €, 4 %, 20 years. The user changes the term to 25. The result disappears. Pressing "Calculate" shows the result for 25 years.

## Inputs and limits

| Input                | Unit        | Allowed values                           |
| -------------------- | ----------- | ---------------------------------------- |
| Loan amount          | €           | 1,000 to 10,000,000, up to 2 decimals    |
| Annual interest rate | %           | 0 to 25, up to 2 decimals (0 is allowed) |
| Term                 | whole years | 1 to 40, integer                         |

The decimal separator is a dot (3.75).

## Domain rules

- The loan is a fixed-rate annuity, and the rate does not change during the term.
- The monthly rate is annual rate ÷ 12 ÷ 100. The number of months is term × 12.
- Payment = L · r / (1 − (1 + r)⁻ⁿ), where L is the loan amount, r the monthly rate and n the number of months.
- The payment is rounded to cents first, half up. Totals are computed from the rounded payment, with the 0 % and the never-below-0.00 rules from FR2.
- V1 ignores that a real loan's last payment differs by a few cents.
- Results are calculated only when the user presses "Calculate" (or Enter), not live while typing.

## Out of scope V1

- Amortization schedule (month-by-month principal and interest)
- Equal-principal (declining payment) loans
- Property price and down payment
- Fees, insurance, property tax
- Extra or early repayments
- Variable or changing rates
- Comparing two loans side by side
- Saving, sharing, export to PDF
- Other currencies, a currency selector, a term entered in months
- Decimal comma input

## Decisions on the former open questions

1. **Decimal comma:** not accepted in V1. Input uses a dot only. "3,75" shows "Enter a number".
2. **Interest rate meaning:** the nominal annual rate with monthly compounding. The effective annual rate (APR/RPMN) is not used.
3. **Limits:** unchanged (1,000 to 10,000,000 €, 0 to 25 %, 1 to 40 years).
4. **Language:** the user interface is in English.

## Decisions from the independent review

See `04-review.md`. The review added: half-up rounding (FR1), the 0 % and never-negative interest rules (FR2), strict input syntax, decimal and whole-number checks (FR3), the exact display format (FR4), the Enter key (FR1) and FR5 (stale result).

## Open questions

None at the moment.
