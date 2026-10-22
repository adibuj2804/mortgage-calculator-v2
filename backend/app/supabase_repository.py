import uuid

from app.repository import NewCalculation, RepositoryUnavailable, SavedCalculation


class UnavailableRepository:
    """Used when no database is configured: every call says the database is unavailable."""

    def save(self, new: NewCalculation) -> SavedCalculation:
        raise RepositoryUnavailable("no database is configured")

    def list_for_client(self, client_id: uuid.UUID, limit: int) -> list[SavedCalculation]:
        raise RepositoryUnavailable("no database is configured")

    def ping(self) -> None:
        raise RepositoryUnavailable("no database is configured")
