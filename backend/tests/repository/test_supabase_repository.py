import json
import os
import uuid
from urllib.parse import parse_qs

import httpx
import pytest

from app.repository import ExtraSummary, NewCalculation, RepositoryUnavailable
from app.supabase_repository import SupabaseRepository

URL = "https://project.supabase.co"
KEY = "sb_secret_test"
CLIENT = uuid.UUID("11111111-1111-4111-8111-111111111111")
COLUMNS = {
    "client_id", "loan_cents", "annual_rate_hundredths", "term_months", "extra_monthly_cents",
    "monthly_payment_cents", "total_paid_cents", "total_interest_cents", "months_to_payoff",
    "months_saved", "extra_total_interest_cents", "interest_saved_cents",
}  # fmt: skip


def row(**changes):
    base = {
        "id": "00000000-0000-4000-8000-000000000001",
        "created_at": "2026-01-01T00:00:01+00:00",
        "client_id": str(CLIENT),
        "loan_cents": 10_000_000,
        "annual_rate_hundredths": 400,
        "term_months": 240,
        "extra_monthly_cents": 0,
        "monthly_payment_cents": 60598,
        "total_paid_cents": 14_543_520,
        "total_interest_cents": 4_543_520,
        "months_to_payoff": None,
        "months_saved": None,
        "extra_total_interest_cents": None,
        "interest_saved_cents": None,
    }
    return {**base, **changes}


def new(extra=None):
    return NewCalculation(CLIENT, 10_000_000, 400, 240, 0, 60598, 14_543_520, 4_543_520, extra)


def repository(handler, key=KEY):
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return SupabaseRepository(URL, key, client)


class Recorder:
    def __init__(self, response):
        self.requests: list[httpx.Request] = []
        self.response = response

    def __call__(self, request):
        self.requests.append(request)
        return self.response(request) if callable(self.response) else self.response


def test_supabase_repository_save_sends_correct_request():
    recorder = Recorder(httpx.Response(201, json=[row()]))
    saved = repository(recorder).save(new())

    (request,) = recorder.requests
    assert request.method == "POST"
    assert str(request.url) == f"{URL}/rest/v1/calculations"
    assert request.headers["apikey"] == KEY
    assert request.headers["prefer"] == "return=representation"
    assert set(json.loads(request.content)) == COLUMNS
    assert (saved.id, saved.created_at) == (
        "00000000-0000-4000-8000-000000000001",
        "2026-01-01T00:00:01+00:00",
    )
    assert saved.client_id == CLIENT and saved.extra is None


def test_supabase_repository_list_sends_correct_query():
    recorder = Recorder(httpx.Response(200, json=[row()]))
    items = repository(recorder).list_for_client(CLIENT, 20)

    (request,) = recorder.requests
    query = parse_qs(request.url.query.decode())
    assert request.method == "GET"
    assert request.url.path == "/rest/v1/calculations"
    assert query["client_id"] == [f"eq.{CLIENT}"]
    assert query["order"] == ["created_at.desc,id.desc"]
    assert query["limit"] == ["20"]
    assert len(items) == 1


def test_supabase_repository_parses_extra_columns():
    with_extra = row(
        months_to_payoff=161,
        months_saved=79,
        extra_total_interest_cents=2_926_329,
        interest_saved_cents=1_617_192,
    )
    recorder = Recorder(httpx.Response(200, json=[with_extra, row()]))
    first, second = repository(recorder).list_for_client(CLIENT, 20)
    assert first.extra == ExtraSummary(161, 79, 2_926_329, 1_617_192)
    assert second.extra is None


def test_supabase_repository_wrong_answer_is_unavailable():
    not_json = Recorder(httpx.Response(200, text="not json"))
    missing = row()
    del missing["loan_cents"]
    lacks_column = Recorder(httpx.Response(200, json=[missing]))
    with pytest.raises(RepositoryUnavailable):
        repository(not_json).list_for_client(CLIENT, 20)
    with pytest.raises(RepositoryUnavailable):
        repository(lacks_column).list_for_client(CLIENT, 20)


def test_supabase_repository_maps_http_error_to_unavailable():
    for status in (500, 401):
        recorder = Recorder(httpx.Response(status, json={"message": "no"}))
        with pytest.raises(RepositoryUnavailable):
            repository(recorder).save(new())


def test_supabase_repository_maps_network_error_to_unavailable():
    def refuse(request):
        raise httpx.ConnectError("refused", request=request)

    def slow(request):
        raise httpx.ReadTimeout("slow", request=request)

    for handler in (refuse, slow):
        with pytest.raises(RepositoryUnavailable):
            repository(handler).list_for_client(CLIENT, 20)


def test_supabase_repository_bearer_only_for_jwt_keys():
    plain = Recorder(httpx.Response(200, json=[]))
    repository(plain, key="sb_secret_abc").list_for_client(CLIENT, 20)
    assert "authorization" not in plain.requests[0].headers

    jwt = Recorder(httpx.Response(200, json=[]))
    repository(jwt, key="eyJ.abc.def").list_for_client(CLIENT, 20)
    assert jwt.requests[0].headers["authorization"] == "Bearer eyJ.abc.def"


def test_supabase_repository_ping():
    repository(Recorder(httpx.Response(200, json=[]))).ping()

    def refuse(request):
        raise httpx.ConnectError("refused", request=request)

    with pytest.raises(RepositoryUnavailable):
        repository(refuse).ping()


def test_supabase_repository_uses_10_second_timeout():
    recorder = Recorder(httpx.Response(200, json=[]))
    repo = repository(recorder)
    repo.list_for_client(CLIENT, 20)
    repo.ping()
    assert len(recorder.requests) == 2
    for request in recorder.requests:
        assert request.extensions["timeout"] == {"connect": 10, "read": 10, "write": 10, "pool": 10}


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_INTEGRATION") != "1", reason="set RUN_INTEGRATION=1")
def test_supabase_integration_round_trip():
    url, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"]
    client = uuid.uuid4()
    repo = SupabaseRepository(url, key)
    saved = repo.save(
        NewCalculation(client, 10_000_000, 400, 240, 0, 60598, 14_543_520, 4_543_520, None)
    )
    try:
        assert [item.id for item in repo.list_for_client(client, 20)] == [saved.id]
    finally:
        httpx.delete(
            f"{url}/rest/v1/calculations",
            params={"client_id": f"eq.{client}"},
            headers={"apikey": key},
            timeout=10,
        )
    assert repo.list_for_client(client, 20) == []
