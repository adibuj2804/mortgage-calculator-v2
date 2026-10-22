"""Models that describe the API for the OpenAPI file. The routes build plain dictionaries."""

from pydantic import BaseModel


class CalculateRequest(BaseModel):
    loan: str
    annual_rate_percent: str
    term_years: str
    extra_monthly_payment: str | None = None


class SaveRequest(CalculateRequest):
    client_id: str


class InputModel(BaseModel):
    loan_cents: int
    annual_rate_hundredths: int
    term_months: int
    extra_monthly_cents: int


class ResultModel(BaseModel):
    monthly_payment_cents: int
    total_paid_cents: int
    total_interest_cents: int


class ExtraPaymentModel(BaseModel):
    months_to_payoff: int
    months_saved: int
    total_interest_cents: int
    interest_saved_cents: int


class YearRowModel(BaseModel):
    year: int
    payments_cents: int
    interest_cents: int
    principal_cents: int
    end_balance_cents: int


class ScheduleModel(BaseModel):
    yearly: list[YearRowModel]
    total_payments_cents: int
    total_interest_cents: int
    extra_balance_by_year_cents: list[int] | None


class CalculateResponse(BaseModel):
    input: InputModel
    result: ResultModel
    extra_payment: ExtraPaymentModel | None
    schedule: ScheduleModel


class SavedCalculationModel(BaseModel):
    id: str
    created_at: str
    input: InputModel
    result: ResultModel
    extra_payment: ExtraPaymentModel | None


class ListResponse(BaseModel):
    items: list[SavedCalculationModel]


class HealthResponse(BaseModel):
    status: str
    database: str


class ErrorsResponse(BaseModel):
    errors: dict[str, str]


class ErrorResponse(BaseModel):
    error: str
