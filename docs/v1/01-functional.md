# Mortgage calculator V1: Functional scope

## Purpose

A user enters a loan amount, an annual interest rate and a term in years. They get the monthly payment and what the loan costs in total. V1 does one calculation for one fixed-rate annuity loan.

## Functional requirements

### FR1: Calculate the monthly payment

- **Inputs:** loan amount, annual interest rate, term in years. The user presses "Calculate".
- **Output:** the monthly payment.
- **Rules:**
  - It is an annuity: the same payment every month.
  - The payment is rounded to cents.
  - If the rate is 0 %, the payment is loan amount ÷ number of months, rounded to cents.
- **Example:** 100,000 €, 4 %, 20 years gives a payment of **605.98 €**. For 200,000 €, 3.5 %, 30 years the payment is **898.09 €**. For 120,000 €, 0 %, 10 years it is **1,000.00 €**.

### FR2: Show total paid and total interest

- **Inputs:** same as FR1.
- **Output:** total paid and total interest.
- **Rules:**
  - Total paid = rounded monthly payment × number of months.
  - Total interest = total paid − loan amount.
- **Example:** 100,000 €, 4 %, 20 years gives total paid **145,435.20 €** (605.98 × 240) and total interest **45,435.20 €**. For 120,000 €, 0 %, 10 years, total interest is **0.00 €**.

### FR3: Validate inputs

- **Inputs:** the three fields.
- **Output:** a message next to each invalid field, and no result.
- **Rules:**
  - An empty or non-numeric field shows "Enter a number".
  - A value outside the limits shows the allowed range.
  - Each invalid field shows its own message.
  - If the inputs become invalid after a result was shown, the result is cleared.
- **Example:** loan amount empty, rate 30, term 20 shows "Enter a number" under loan amount and "Rate must be between 0 and 25 %" under rate. No result is shown.

### FR4: Display format

- **Inputs:** the calculated results.
- **Output:** amounts in euros with a thousands separator and 2 decimals.
- **Rules:** the currency is € only, and there is no selector.
- **Example:** `145,435.20 €`.

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
- The payment is rounded to cents first. All totals are computed from the rounded payment.
- V1 ignores that a real loan's last payment differs by a few cents.
- Results are calculated only when the user presses "Calculate", not live while typing.

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

## Open questions

1. Decimal comma (3,75): assumed dot only. Should the comma be accepted too?
2. The "annual interest rate" is the nominal rate with monthly compounding, which is the standard for mortgages. Is that the meaning wanted, or is the effective annual rate (APR/RPMN) needed?
3. Are the limits (up to 10 M €, 25 %, 40 years) acceptable, or should they be tighter?
4. Should the user interface be in English or Slovak?
