import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.config import Settings
from app.main import make_repository
from app.repository import ExtraSummary, InMemoryRepository, NewCalculation, RepositoryUnavailable
from app.supabase_repository import UnavailableRepository

A = uuid.UUID("11111111-1111-4111-8111-111111111111")
B = uuid.UUID("22222222-2222-4222-8222-222222222222")


def new(client=A, payment=60598, extra=None):
    return NewCalculation(client, 10_000_000, 400, 240, 0, payment, 14_543_520, 4_543_520, extra)


def test_memory_repository_saves_and_lists_newest_first():
    repository = InMemoryRepository()
    for payment in (1, 2, 3):
        repository.save(new(payment=payment))
    assert [item.monthly_payment_cents for item in repository.list_for_client(A, 20)] == [3, 2, 1]


def test_memory_repository_isolates_clients():
    repository = InMemoryRepository()
    repository.save(new(A))
    repository.save(new(B))
    assert [item.client_id for item in repository.list_for_client(A, 20)] == [A]


def test_memory_repository_limit():
    repository = InMemoryRepository()
    for payment in (1, 2, 3):
        repository.save(new(payment=payment))
    assert [item.monthly_payment_cents for item in repository.list_for_client(A, 2)] == [3, 2]


def test_memory_repository_ids_and_times_follow_the_rule():
    repository = InMemoryRepository()
    saved = [repository.save(new(extra=ExtraSummary(1, 2, 3, 4))) for _ in range(61)]
    expected = [
        (1, "00000000-0000-4000-8000-000000000001", "2026-01-01T00:00:01+00:00"),
        (12, "00000000-0000-4000-8000-000000000012", "2026-01-01T00:00:12+00:00"),
        (61, "00000000-0000-4000-8000-000000000061", "2026-01-01T00:01:01+00:00"),
    ]
    for number, identifier, created in expected:
        assert (saved[number - 1].id, saved[number - 1].created_at) == (identifier, created)
    assert datetime.fromisoformat(saved[60].created_at) == datetime(
        2026, 1, 1, tzinfo=UTC
    ) + timedelta(seconds=61)


def test_unconfigured_repository_is_unavailable():
    for call in (
        lambda r: r.save(new()),
        lambda r: r.list_for_client(A, 20),
        lambda r: r.ping(),
    ):
        with pytest.raises(RepositoryUnavailable):
            call(UnavailableRepository())
    settings = Settings.from_env({"STORAGE": "supabase"})
    assert not settings.supabase_configured
    assert isinstance(make_repository(settings), UnavailableRepository)


def test_settings_memory_storage():
    settings = Settings.from_env({"STORAGE": "memory"})
    assert isinstance(make_repository(settings), InMemoryRepository)


def test_settings_parse_allowed_origins():
    listed = Settings.from_env({"ALLOWED_ORIGINS": "http://a.example, http://b.example"})
    assert listed.allowed_origins == ("http://a.example", "http://b.example")
    assert Settings.from_env({}).allowed_origins == ("http://localhost:5173",)


def test_settings_empty_allowed_origins_allows_none():
    assert Settings.from_env({"ALLOWED_ORIGINS": ""}).allowed_origins == ()


def test_settings_invalid_storage_raises():
    with pytest.raises(ValueError):
        Settings.from_env({"STORAGE": "postgres"})
