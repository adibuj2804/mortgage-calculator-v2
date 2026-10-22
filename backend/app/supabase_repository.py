import uuid

import httpx

from app.repository import ExtraSummary, NewCalculation, RepositoryUnavailable, SavedCalculation

TIMEOUT_SECONDS = 10


class UnavailableRepository:
    """Used when no database is configured: every call says the database is unavailable."""

    def save(self, new: NewCalculation) -> SavedCalculation:
        raise RepositoryUnavailable("no database is configured")

    def list_for_client(self, client_id: uuid.UUID, limit: int) -> list[SavedCalculation]:
        raise RepositoryUnavailable("no database is configured")

    def ping(self) -> None:
        raise RepositoryUnavailable("no database is configured")


class SupabaseRepository:
    """Stores calculations in the Supabase table `calculations` over its REST interface."""

    def __init__(self, url: str, key: str, http_client: httpx.Client | None = None) -> None:
        self._table = f"{url.rstrip('/')}/rest/v1/calculations"
        self._key = key
        self._client = http_client or httpx.Client()

    def _headers(self, **extra: str) -> dict[str, str]:
        headers = {"apikey": self._key, **extra}
        if self._key.startswith("eyJ"):  # legacy JWT keys also go in the Authorization header
            headers["Authorization"] = f"Bearer {self._key}"
        return headers

    def _request(self, method: str, **kwargs) -> list[dict]:
        try:
            response = self._client.request(method, self._table, timeout=TIMEOUT_SECONDS, **kwargs)
            response.raise_for_status()
            rows = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise RepositoryUnavailable(str(error)) from error
        if not isinstance(rows, list):
            raise RepositoryUnavailable("the database answered with something unexpected")
        return rows

    def save(self, new: NewCalculation) -> SavedCalculation:
        extra = new.extra
        body = {
            "client_id": str(new.client_id),
            "loan_cents": new.loan_cents,
            "annual_rate_hundredths": new.annual_rate_hundredths,
            "term_months": new.term_months,
            "extra_monthly_cents": new.extra_monthly_cents,
            "monthly_payment_cents": new.monthly_payment_cents,
            "total_paid_cents": new.total_paid_cents,
            "total_interest_cents": new.total_interest_cents,
            "months_to_payoff": extra.months_to_payoff if extra else None,
            "months_saved": extra.months_saved if extra else None,
            "extra_total_interest_cents": extra.total_interest_cents if extra else None,
            "interest_saved_cents": extra.interest_saved_cents if extra else None,
        }
        headers = self._headers(**{"Prefer": "return=representation"})
        rows = self._request("POST", headers=headers, json=body)
        return self._parse(rows[0] if rows else {})

    def list_for_client(self, client_id: uuid.UUID, limit: int) -> list[SavedCalculation]:
        params = {
            "client_id": f"eq.{client_id}",
            "order": "created_at.desc,id.desc",
            "limit": str(limit),
        }
        rows = self._request("GET", headers=self._headers(), params=params)
        return [self._parse(row) for row in rows]

    def ping(self) -> None:
        self._request("GET", headers=self._headers(), params={"select": "id", "limit": "1"})

    @staticmethod
    def _parse(row: dict) -> SavedCalculation:
        try:
            extra = None
            if row["months_to_payoff"] is not None:
                extra = ExtraSummary(
                    months_to_payoff=int(row["months_to_payoff"]),
                    months_saved=int(row["months_saved"]),
                    total_interest_cents=int(row["extra_total_interest_cents"]),
                    interest_saved_cents=int(row["interest_saved_cents"]),
                )
            return SavedCalculation(
                client_id=uuid.UUID(row["client_id"]),
                loan_cents=int(row["loan_cents"]),
                annual_rate_hundredths=int(row["annual_rate_hundredths"]),
                term_months=int(row["term_months"]),
                extra_monthly_cents=int(row["extra_monthly_cents"]),
                monthly_payment_cents=int(row["monthly_payment_cents"]),
                total_paid_cents=int(row["total_paid_cents"]),
                total_interest_cents=int(row["total_interest_cents"]),
                extra=extra,
                id=str(row["id"]),
                created_at=str(row["created_at"]),
            )
        except (KeyError, TypeError, ValueError) as error:
            raise RepositoryUnavailable("the database answered with an unusable row") from error
