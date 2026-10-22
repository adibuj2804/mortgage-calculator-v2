import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol


class RepositoryUnavailable(Exception):
    """The storage cannot be reached, refused the request, or gave an unusable answer."""


@dataclass(frozen=True)
class ExtraSummary:
    months_to_payoff: int
    months_saved: int
    total_interest_cents: int
    interest_saved_cents: int


@dataclass(frozen=True)
class NewCalculation:
    client_id: uuid.UUID
    loan_cents: int
    annual_rate_hundredths: int
    term_months: int
    extra_monthly_cents: int
    monthly_payment_cents: int
    total_paid_cents: int
    total_interest_cents: int
    extra: ExtraSummary | None


@dataclass(frozen=True)
class SavedCalculation(NewCalculation):
    id: str
    created_at: str


class CalculationRepository(Protocol):
    def save(self, new: NewCalculation) -> SavedCalculation: ...

    def list_for_client(self, client_id: uuid.UUID, limit: int) -> list[SavedCalculation]: ...

    def ping(self) -> None: ...


class InMemoryRepository:
    """Keeps calculations in memory. The n-th item gets a predictable id and creation time."""

    def __init__(self) -> None:
        self._items: list[SavedCalculation] = []

    def save(self, new: NewCalculation) -> SavedCalculation:
        number = len(self._items) + 1
        created = datetime(2026, 1, 1, tzinfo=UTC) + timedelta(seconds=number)
        saved = SavedCalculation(
            **vars(new),
            id=f"00000000-0000-4000-8000-{number:012d}",
            created_at=created.isoformat(),
        )
        self._items.append(saved)
        return saved

    def list_for_client(self, client_id: uuid.UUID, limit: int) -> list[SavedCalculation]:
        own = [item for item in reversed(self._items) if item.client_id == client_id]
        return own[:limit]

    def ping(self) -> None:
        return None
