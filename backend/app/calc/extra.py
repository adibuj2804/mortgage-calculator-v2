from dataclasses import dataclass

from app.calc.schedule import Schedule


@dataclass(frozen=True)
class ExtraResult:
    months_to_payoff: int
    total_interest_cents: int
    months_saved: int
    interest_saved_cents: int
    balances_by_year_cents: list[int]


def calculate_extra(standard: Schedule, extra: Schedule) -> ExtraResult:
    """Compare the extra payment schedule with the standard schedule of the same loan."""
    if extra.months > standard.months or extra.total_interest > standard.total_interest:
        raise ValueError("an extra payment cannot make the loan longer or more expensive")
    return ExtraResult(
        months_to_payoff=extra.months,
        total_interest_cents=extra.total_interest,
        months_saved=standard.months - extra.months,
        interest_saved_cents=standard.total_interest - extra.total_interest,
        balances_by_year_cents=extra.balances_by_year(),
    )
