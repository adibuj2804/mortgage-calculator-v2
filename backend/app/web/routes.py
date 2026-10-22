import json
import re
import uuid
from collections.abc import Sequence
from dataclasses import asdict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.calc.validate import Invalid
from app.repository import RepositoryUnavailable, SavedCalculation
from app.service import Calculation, CalculationService
from app.web import models

MAX_BODY_BYTES = 10_000
DEFAULT_LIMIT = 20
UUID_FORM = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)
LIMIT_FORM = re.compile(r"[0-9]{1,3}")

INVALID_REQUEST = {"_request": "Invalid request"}
INVALID_CLIENT_ID = "Invalid client id"
INVALID_LIMIT = "Limit must be between 1 and 50"

BODY_DOC = {
    "requestBody": {
        "required": True,
        "content": {"application/json": {"schema": models.CalculateRequest.model_json_schema()}},
    }
}
SAVE_BODY_DOC = {
    "requestBody": {
        "required": True,
        "content": {"application/json": {"schema": models.SaveRequest.model_json_schema()}},
    }
}
ERRORS_422 = {"model": models.ErrorsResponse, "description": "Invalid input"}
ERROR_503 = {"model": models.ErrorResponse, "description": "The database is unavailable"}


def _errors(errors: dict[str, str]) -> JSONResponse:
    return JSONResponse({"errors": errors}, status_code=422)


def _extra_json(summary) -> dict | None:
    if summary is None:
        return None
    return {
        "months_to_payoff": summary.months_to_payoff,
        "months_saved": summary.months_saved,
        "total_interest_cents": summary.total_interest_cents,
        "interest_saved_cents": summary.interest_saved_cents,
    }


def _calculation_json(calculation: Calculation) -> dict:
    value, result, extra = calculation.input, calculation.result, calculation.extra
    standard = calculation.schedule
    return {
        "input": {
            "loan_cents": value.loan_cents,
            "annual_rate_hundredths": value.annual_rate_hundredths,
            "term_months": value.term_months,
            "extra_monthly_cents": value.extra_monthly_cents,
        },
        "result": asdict(result),
        "extra_payment": _extra_json(extra),
        "schedule": {
            "yearly": [asdict(year) for year in standard.yearly()],
            "total_payments_cents": standard.total_payments,
            "total_interest_cents": standard.total_interest,
            "extra_balance_by_year_cents": None if extra is None else extra.balances_by_year_cents,
        },
    }


def _saved_json(saved: SavedCalculation) -> dict:
    return {
        "id": saved.id,
        "created_at": saved.created_at,
        "input": {
            "loan_cents": saved.loan_cents,
            "annual_rate_hundredths": saved.annual_rate_hundredths,
            "term_months": saved.term_months,
            "extra_monthly_cents": saved.extra_monthly_cents,
        },
        "result": {
            "monthly_payment_cents": saved.monthly_payment_cents,
            "total_paid_cents": saved.total_paid_cents,
            "total_interest_cents": saved.total_interest_cents,
        },
        "extra_payment": _extra_json(saved.extra),
    }


async def _read_object(request: Request) -> dict | None:
    raw = await request.body()
    if len(raw) > MAX_BODY_BYTES:
        return None
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError, RecursionError):
        return None
    return data if isinstance(data, dict) else None


def _parse_client_id(value: object) -> uuid.UUID | None:
    if isinstance(value, str) and UUID_FORM.fullmatch(value):
        return uuid.UUID(value)
    return None


def create_app(service: CalculationService, allowed_origins: Sequence[str]) -> FastAPI:
    app = FastAPI(title="Mortgage calculator API", version="1.0.0", redirect_slashes=False)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(allowed_origins),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
        allow_credentials=False,
        max_age=600,
    )

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse({"error": "internal_error"}, status_code=500)

    @app.get("/api/v1/health", responses={200: {"model": models.HealthResponse}})
    def health() -> JSONResponse:
        return JSONResponse({"status": "ok", "database": service.database_status()})

    @app.post(
        "/api/v1/calculate",
        openapi_extra=BODY_DOC,
        responses={200: {"model": models.CalculateResponse}, 422: ERRORS_422},
    )
    async def calculate(request: Request) -> JSONResponse:
        data = await _read_object(request)
        if data is None:
            return _errors(INVALID_REQUEST)
        checked = service.validate(data)
        if isinstance(checked, Invalid):
            return _errors(checked.errors)
        return JSONResponse(_calculation_json(service.calculate(checked)))

    @app.post(
        "/api/v1/calculations",
        status_code=201,
        openapi_extra=SAVE_BODY_DOC,
        responses={
            201: {"model": models.SavedCalculationModel},
            422: ERRORS_422,
            503: ERROR_503,
        },
    )
    async def save(request: Request) -> JSONResponse:
        data = await _read_object(request)
        if data is None:
            return _errors(INVALID_REQUEST)
        checked = service.validate(data)
        client_id = _parse_client_id(data.get("client_id"))
        errors = dict(checked.errors) if isinstance(checked, Invalid) else {}
        if client_id is None:
            errors["client_id"] = INVALID_CLIENT_ID
        if errors or isinstance(checked, Invalid) or client_id is None:
            return _errors(errors)
        try:
            saved = service.save(checked, client_id)
        except RepositoryUnavailable:
            return JSONResponse({"error": "database_unavailable"}, status_code=503)
        return JSONResponse(_saved_json(saved), status_code=201)

    @app.get(
        "/api/v1/calculations",
        responses={200: {"model": models.ListResponse}, 422: ERRORS_422, 503: ERROR_503},
    )
    def list_calculations(request: Request) -> JSONResponse:
        errors: dict[str, str] = {}
        ids = request.query_params.getlist("client_id")
        client_id = _parse_client_id(ids[0]) if len(ids) == 1 else None
        if client_id is None:
            errors["client_id"] = INVALID_CLIENT_ID

        limits = request.query_params.getlist("limit")
        limit = DEFAULT_LIMIT
        if len(limits) > 1:
            errors["limit"] = INVALID_LIMIT
        elif limits:
            text = limits[0]
            limit = int(text) if LIMIT_FORM.fullmatch(text) else 0
            if not 1 <= limit <= 50:
                errors["limit"] = INVALID_LIMIT
        if errors or client_id is None:
            return _errors(errors)
        try:
            items = service.list(client_id, limit)
        except RepositoryUnavailable:
            return JSONResponse({"error": "database_unavailable"}, status_code=503)
        return JSONResponse({"items": [_saved_json(item) for item in items]})

    return app
