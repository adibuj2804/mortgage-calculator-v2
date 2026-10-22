from dataclasses import dataclass

from app.calc.payment import RATE_UNIT, require_int


@dataclass(frozen=True)
class Month:
    payment: int
    interest: int
    principal: int
    balance: int


@dataclass(frozen=True)
class YearRow:
    year: int
    payments_cents: int
    interest_cents: int
    principal_cents: int
    end_balance_cents: int


@dataclass(frozen=True)
class Schedule:
    loan_cents: int
    rows: tuple[Month, ...]

    @property
    def months(self) -> int:
        return len(self.rows)

    @property
    def total_payments(self) -> int:
        return sum(row.payment for row in self.rows)

    @property
    def total_interest(self) -> int:
        return sum(row.interest for row in self.rows)

    def yearly(self) -> list[YearRow]:
        years = []
        for start in range(0, len(self.rows), 12):
            chunk = self.rows[start : start + 12]
            years.append(
                YearRow(
                    year=start // 12 + 1,
                    payments_cents=sum(row.payment for row in chunk),
                    interest_cents=sum(row.interest for row in chunk),
                    principal_cents=sum(row.principal for row in chunk),
                    end_balance_cents=chunk[-1].balance,
                )
            )
        return years

    def balances_by_year(self) -> list[int]:
        return [self.loan_cents, *(year.end_balance_cents for year in self.yearly())]


def build_schedule(
    loan_cents: int,
    annual_rate_hundredths: int,
    term_months: int,
    regular_payment_cents: int,
    extra_cents: int = 0,
) -> Schedule:
    """Run the loan month by month.

    Without an extra payment (the standard schedule) the payment is the regular payment, the loan
    ends as soon as balance + interest is not more than it, and in the last month of the term the
    payment is whatever is left. With an extra payment the payment is the smaller of
    (regular + extra) and (balance + interest), without any adjustment.
    """
    for name, value in [
        ("loan_cents", loan_cents),
        ("annual_rate_hundredths", annual_rate_hundredths),
        ("term_months", term_months),
        ("regular_payment_cents", regular_payment_cents),
        ("extra_cents", extra_cents),
    ]:
        require_int(name, value)
    if (
        loan_cents <= 0
        or annual_rate_hundredths < 0
        or term_months < 1
        or regular_payment_cents < 1
        or extra_cents < 0
    ):
        raise ValueError("invalid schedule arguments")

    balance = loan_cents
    rows: list[Month] = []
    for month in range(1, term_months + 13):
        interest = (2 * balance * annual_rate_hundredths + RATE_UNIT) // (2 * RATE_UNIT)
        owed = balance + interest
        if extra_cents == 0:
            last = month == term_months or regular_payment_cents >= owed
            payment = owed if last else regular_payment_cents
        else:
            payment = min(regular_payment_cents + extra_cents, owed)
        balance = owed - payment
        rows.append(Month(payment, interest, payment - interest, balance))
        if balance == 0:
            return Schedule(loan_cents, tuple(rows))
    raise RuntimeError("the loan did not end within the term plus 12 months")
