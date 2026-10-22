import uuid
from collections.abc import Mapping
from dataclasses import dataclass

from app.calc.extra import ExtraResult, calculate_extra
from app.calc.payment import LoanResult, calculate_loan
from app.calc.schedule import Schedule, build_schedule
from app.calc.validate import Invalid, Valid, ValidInput, validate_inputs
from app.repository import (
    CalculationRepository,
    ExtraSummary,
    NewCalculation,
    RepositoryUnavailable,
    SavedCalculation,
)


@dataclass(frozen=True)
class Calculation:
    input: ValidInput
    result: LoanResult
    schedule: Schedule
    extra: ExtraResult | None


class CalculationService:
    def __init__(self, repository: CalculationRepository) -> None:
        self.repository = repository

    def validate(self, raw: Mapping[str, object]) -> Valid | Invalid:
        return validate_inputs(
            raw.get("loan"),
            raw.get("annual_rate_percent"),
            raw.get("term_years"),
            raw.get("extra_monthly_payment"),
        )

    def calculate(self, valid: Valid) -> Calculation:
        value = valid.value
        result = calculate_loan(value.loan_cents, value.annual_rate_hundredths, value.term_months)
        regular = result.monthly_payment_cents
        standard = build_schedule(
            value.loan_cents, value.annual_rate_hundredths, value.term_months, regular
        )
        extra = None
        if value.extra_monthly_cents > 0:
            scenario = build_schedule(
                value.loan_cents,
                value.annual_rate_hundredths,
                value.term_months,
                regular,
                extra_cents=value.extra_monthly_cents,
            )
            extra = calculate_extra(standard, scenario)
        return Calculation(value, result, standard, extra)

    def save(self, valid: Valid, client_id: uuid.UUID) -> SavedCalculation:
        calculation = self.calculate(valid)
        value, result, extra = calculation.input, calculation.result, calculation.extra
        return self.repository.save(
            NewCalculation(
                client_id=client_id,
                loan_cents=value.loan_cents,
                annual_rate_hundredths=value.annual_rate_hundredths,
                term_months=value.term_months,
                extra_monthly_cents=value.extra_monthly_cents,
                monthly_payment_cents=result.monthly_payment_cents,
                total_paid_cents=result.total_paid_cents,
                total_interest_cents=result.total_interest_cents,
                extra=None
                if extra is None
                else ExtraSummary(
                    months_to_payoff=extra.months_to_payoff,
                    months_saved=extra.months_saved,
                    total_interest_cents=extra.total_interest_cents,
                    interest_saved_cents=extra.interest_saved_cents,
                ),
            )
        )

    def list(self, client_id: uuid.UUID, limit: int) -> list[SavedCalculation]:
        return self.repository.list_for_client(client_id, limit)

    def database_status(self) -> str:
        try:
            self.repository.ping()
        except RepositoryUnavailable:
            return "unavailable"
        return "ok"
