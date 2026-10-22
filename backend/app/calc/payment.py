from dataclasses import dataclass
from fractions import Fraction

# The monthly rate is R / RATE_UNIT, where R is the annual rate in hundredths of a percent.
RATE_UNIT = 120_000


@dataclass(frozen=True)
class LoanResult:
    monthly_payment_cents: int
    total_paid_cents: int
    total_interest_cents: int


def require_int(name: str, value: object) -> int:
    if type(value) is not int:
        raise ValueError(f"{name} must be a whole number, got {value!r}")
    return value


def annuity_payment(balance_cents: int, monthly_rate: Fraction | int, months: int) -> Fraction:
    """The exact annuity payment in cents. The monthly rate is a Fraction (or the int 0)."""
    require_int("balance_cents", balance_cents)
    require_int("months", months)
    if type(monthly_rate) is int:
        monthly_rate = Fraction(monthly_rate)
    if not isinstance(monthly_rate, Fraction):
        raise ValueError(f"monthly_rate must be a Fraction, got {monthly_rate!r}")
    if balance_cents <= 0 or monthly_rate < 0 or months < 1:
        raise ValueError("balance must be positive, the rate not negative and months at least 1")

    if monthly_rate == 0:
        return Fraction(balance_cents, months)
    return balance_cents * monthly_rate / (1 - (1 + monthly_rate) ** -months)


def calculate_loan(loan_cents: int, annual_rate_hundredths: int, months: int) -> LoanResult:
    """The V1 rules: payment rounded half up to the cent, then the totals from that payment."""
    require_int("loan_cents", loan_cents)
    require_int("annual_rate_hundredths", annual_rate_hundredths)
    require_int("months", months)
    if loan_cents <= 0 or annual_rate_hundredths < 0 or months < 1:
        raise ValueError("loan must be positive, the rate not negative and months at least 1")

    if annual_rate_hundredths == 0:
        payment = (2 * loan_cents + months) // (2 * months)
        return LoanResult(payment, loan_cents, 0)

    growth = (RATE_UNIT + annual_rate_hundredths) ** months
    numerator = loan_cents * annual_rate_hundredths * growth
    denominator = RATE_UNIT * (growth - RATE_UNIT**months)
    payment = (2 * numerator + denominator) // (2 * denominator)
    interest = max(0, payment * months - loan_cents)
    return LoanResult(payment, loan_cents + interest, interest)
