import json

from tests.conftest import BODY, CLIENT_A, CLIENT_B, App, example_files, load_example

CALC = "/api/v1/calculate"
SAVE = "/api/v1/calculations"
LIST = "/api/v1/calculations"
FIELD_ERRORS = {
    "empty_loan": {"loan": "Enter a number"},
    "rate_30": {"annual_rate_percent": "Rate must be between 0 and 25 %"},
}


def body(**changes):
    return {**BODY, **changes}


def run_example(name):
    """Run an example file against a fresh app. Returns (status, response body, example)."""
    from app.repository import InMemoryRepository
    from app.supabase_repository import UnavailableRepository

    example = load_example(name)
    setup = example["setup"]
    repository = (
        UnavailableRepository()
        if setup.get("repository") == "unavailable"
        else InMemoryRepository()
    )
    app = App(repository)
    for saved in setup.get("saved", []):
        assert app.post(SAVE, saved).status_code == 201
    request = example["request"]
    if request["method"] == "GET":
        response = app.get(request["path"])
    else:
        response = app.post(request["path"], request["body"])
    return response.status_code, response.json(), example


def assert_example(name):
    status, response_body, example = run_example(name)
    assert status == example["status"], name
    assert response_body == example["response"], name
    return response_body


def test_health_ok():
    assert_example("health-ok")


def test_health_database_unavailable():
    assert_example("health-database-unavailable")


def test_calculate_100k_4pct_20y():
    response = assert_example("calculate-100k-4pct-20y")
    assert response["result"] == {
        "monthly_payment_cents": 60598,
        "total_paid_cents": 14543520,
        "total_interest_cents": 4543520,
    }
    assert response["extra_payment"] is None
    schedule = response["schedule"]
    assert schedule["total_payments_cents"] == 14543521
    assert schedule["total_interest_cents"] == 4543521
    assert schedule["extra_balance_by_year_cents"] is None
    assert len(schedule["yearly"]) == 20
    assert schedule["yearly"][0] == {
        "year": 1,
        "payments_cents": 727176,
        "interest_cents": 393934,
        "principal_cents": 333242,
        "end_balance_cents": 9666758,
    }
    assert schedule["yearly"][19] == {
        "year": 20,
        "payments_cents": 727177,
        "interest_cents": 15512,
        "principal_cents": 711665,
        "end_balance_cents": 0,
    }


def test_calculate_100k_4pct_20y_extra_200():
    response = assert_example("calculate-100k-4pct-20y-extra-200")
    assert response["input"]["extra_monthly_cents"] == 20000
    assert response["extra_payment"] == {
        "months_to_payoff": 161,
        "months_saved": 79,
        "total_interest_cents": 2926329,
        "interest_saved_cents": 1617192,
    }
    # fmt: off
    assert response["schedule"]["extra_balance_by_year_cents"] == [
        10000000, 9422308, 8821082, 8195361, 7544145, 6866399, 6161041, 5426945,
        4662940, 3867809, 3040283, 2179042, 1282714, 349867, 0,
    ]
    # fmt: on


def test_calculate_100k_4pct_20y_extra_equals_loan():
    response = assert_example("calculate-100k-4pct-20y-extra-equals-loan")
    assert response["extra_payment"] == {
        "months_to_payoff": 1,
        "months_saved": 239,
        "total_interest_cents": 33333,
        "interest_saved_cents": 4510188,
    }
    assert response["schedule"]["extra_balance_by_year_cents"] == [10000000, 0]


def test_calculate_120k_0pct_10y():
    response = assert_example("calculate-120k-0pct-10y")
    assert response["result"] == {
        "monthly_payment_cents": 100000,
        "total_paid_cents": 12000000,
        "total_interest_cents": 0,
    }


def test_calculate_120k_4pct_20y():
    response = assert_example("calculate-120k-4pct-20y")
    assert response["result"] == {
        "monthly_payment_cents": 72718,
        "total_paid_cents": 17452320,
        "total_interest_cents": 5452320,
    }


def test_calculate_100k_4pct_25y():
    response = assert_example("calculate-100k-4pct-25y")
    assert response["result"] == {
        "monthly_payment_cents": 52784,
        "total_paid_cents": 15835200,
        "total_interest_cents": 5835200,
    }


def test_calculate_250k_4_5pct_25y():
    response = assert_example("calculate-250k-4.5pct-25y")
    assert response["result"] == {
        "monthly_payment_cents": 138958,
        "total_paid_cents": 41687400,
        "total_interest_cents": 16687400,
    }


def test_calculate_422_empty_loan():
    response = assert_example("calculate-422-empty-loan")
    assert response == {"errors": FIELD_ERRORS["empty_loan"]}


def test_calculate_422_empty_loan_and_rate_30():
    response = assert_example("calculate-422-empty-loan-and-rate-30")
    assert response == {"errors": {**FIELD_ERRORS["empty_loan"], **FIELD_ERRORS["rate_30"]}}


def test_calculate_422_rate_30():
    response = assert_example("calculate-422-rate-30")
    assert response == {"errors": FIELD_ERRORS["rate_30"]}


def test_calculate_422_decimal_comma():
    response = assert_example("calculate-422-decimal-comma")
    assert response == {"errors": {"annual_rate_percent": "Enter a number"}}


def test_calculate_422_extra_above_loan():
    response = assert_example("calculate-422-extra-above-loan")
    assert response == {
        "errors": {"extra_monthly_payment": "Extra payment must be between 0 and the loan amount"}
    }


def test_calculate_422_missing_fields():
    response = assert_example("calculate-422-missing-fields")
    assert response == {
        "errors": {
            "loan": "Enter a number",
            "annual_rate_percent": "Enter a number",
            "term_years": "Enter a number",
        }
    }


def test_calculate_non_string_value_rejected(app):
    response = app.post(CALC, body(loan=100000))
    assert (response.status_code, response.json()) == (422, {"errors": {"loan": "Enter a number"}})


def test_calculate_extra_non_string_rejected(app):
    response = app.post(CALC, body(extra_monthly_payment=200))
    assert response.status_code == 422
    assert response.json() == {"errors": {"extra_monthly_payment": "Enter a number"}}


def test_calculate_extra_null_or_missing_means_none(app):
    expected = load_example("calculate-100k-4pct-20y")["response"]
    with_null = app.post(CALC, body(extra_monthly_payment=None))
    without = app.post(CALC, {k: v for k, v in BODY.items() if k != "extra_monthly_payment"})
    assert (with_null.status_code, with_null.json()) == (200, expected)
    assert (without.status_code, without.json()) == (200, expected)


def test_calculate_malformed_json(app):
    response = app.post(CALC, content=b"not json")
    assert (response.status_code, response.json()) == (
        422,
        {"errors": {"_request": "Invalid request"}},
    )


def test_calculate_json_edge_cases(app):
    request_error = {"errors": {"_request": "Invalid request"}}

    nan = app.post(CALC, content=b'{"loan": NaN, "annual_rate_percent": "4", "term_years": "20"}')
    assert (nan.status_code, nan.json()) == (422, {"errors": {"loan": "Enter a number"}})

    twice = app.post(
        CALC,
        content=b'{"loan": "x", "loan": "100000", "annual_rate_percent": "4", "term_years": "20"}',
    )
    assert twice.status_code == 200

    bom = app.post(CALC, content=b"\xef\xbb\xbf" + json.dumps(BODY).encode())
    assert (bom.status_code, bom.json()) == (422, request_error)

    large = app.post(CALC, content=json.dumps({**BODY, "padding": "x" * 20_000}).encode())
    assert (large.status_code, large.json()) == (422, request_error)


def test_calculate_empty_body_and_non_object(app):
    for content in (b"", b"[1, 2]", b'"text"'):
        response = app.post(CALC, content=content)
        assert response.status_code == 422, content
        assert response.json() == {"errors": {"_request": "Invalid request"}}, content


def test_calculate_content_type_is_ignored(app):
    expected = load_example("calculate-100k-4pct-20y")["response"]
    response = app.post(
        CALC, content=json.dumps(BODY).encode(), headers={"Content-Type": "text/plain"}
    )
    assert (response.status_code, response.json()) == (200, expected)


def test_calculate_works_without_database(offline_app):
    expected = load_example("calculate-100k-4pct-20y")["response"]
    response = offline_app.post(CALC, BODY)
    assert (response.status_code, response.json()) == (200, expected)


def test_unexpected_error_returns_500_without_details():
    class Broken:
        def validate(self, raw):
            raise RuntimeError("secret internal detail")

    from fastapi.testclient import TestClient

    from app.web import create_app

    client = TestClient(
        create_app(Broken(), ["http://localhost:5173"]), raise_server_exceptions=False
    )
    response = client.post(CALC, json=BODY)
    assert response.status_code == 500
    assert response.json() == {"error": "internal_error"}
    assert "secret" not in response.text


def test_unknown_path_and_wrong_method(app):
    assert app.get("/api/v1/unknown").status_code == 404
    assert app.get(CALC).status_code == 405
    assert app.post("/api/v1/health", {}).status_code == 405
    assert app.get("/api/v1/health/").status_code == 404


def test_cors_allows_configured_origin(app):
    response = app.get("/api/v1/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_preflight_allows_post_with_json(app):
    response = app.client.options(
        CALC,
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "content-type" in response.headers["access-control-allow-headers"].lower()
    assert response.headers["access-control-max-age"] == "600"
    assert "access-control-allow-credentials" not in response.headers


def test_cors_rejects_other_origin(app):
    other = {"Origin": "http://evil.example"}
    assert "access-control-allow-origin" not in app.get("/api/v1/health", headers=other).headers
    preflight = app.client.options(CALC, headers={**other, "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in preflight.headers


def test_save_100k_4pct_20y():
    response = assert_example("save-100k-4pct-20y")
    assert response["id"] == "00000000-0000-4000-8000-000000000001"
    assert response["created_at"] == "2026-01-01T00:00:01+00:00"
    assert "schedule" not in response


def test_save_stores_server_computed_result(app):
    assert app.save(BODY).status_code == 201
    (stored,) = app.repository.list_for_client(__import__("uuid").UUID(CLIENT_A), 20)
    assert (stored.monthly_payment_cents, stored.total_paid_cents, stored.total_interest_cents) == (
        60598,
        14543520,
        4543520,
    )
    assert str(stored.client_id) == CLIENT_A
    assert not hasattr(stored, "schedule")


def test_save_invalid_input_stores_nothing(app):
    response = app.save(body(loan=""))
    assert (response.status_code, response.json()) == (422, {"errors": FIELD_ERRORS["empty_loan"]})
    assert app.repository.list_for_client(__import__("uuid").UUID(CLIENT_A), 20) == []


def test_save_requires_valid_client_id(app):
    for client_id in [None, "not-a-uuid", "{11111111-1111-4111-8111-111111111111}", 123]:
        payload = {**BODY, "client_id": client_id}
        if client_id is None:
            payload.pop("client_id")
        response = app.post(SAVE, payload)
        assert response.status_code == 422, client_id
        assert response.json() == {"errors": {"client_id": "Invalid client id"}}, client_id


def test_save_ignores_client_supplied_result(app):
    tampered = {
        **BODY,
        "client_id": CLIENT_A,
        "result": {"monthly_payment_cents": 1},
        "input": {"loan_cents": 1},
        "id": "x",
        "created_at": "x",
    }
    response = app.post(SAVE, tampered)
    assert response.status_code == 201
    assert response.json() == load_example("save-100k-4pct-20y")["response"]


def test_save_invalid_input_and_client_id_merged(app):
    response = app.post(SAVE, {**BODY, "loan": "", "annual_rate_percent": "30", "client_id": "x"})
    assert response.status_code == 422
    assert response.json() == {
        "errors": {
            "loan": "Enter a number",
            "annual_rate_percent": "Rate must be between 0 and 25 %",
            "client_id": "Invalid client id",
        }
    }


def test_save_malformed_json(app):
    response = app.post(SAVE, content=b"not json")
    assert (response.status_code, response.json()) == (
        422,
        {"errors": {"_request": "Invalid request"}},
    )


def test_save_database_unavailable():
    response = assert_example("save-database-unavailable")
    assert response == {"error": "database_unavailable"}


def test_client_id_is_case_insensitive(app):
    app.save(BODY, client_id=CLIENT_A.upper())
    response = app.get(f"{LIST}?client_id={CLIENT_A}&limit=20")
    assert len(response.json()["items"]) == 1


def test_list_empty():
    assert assert_example("list-empty") == {"items": []}


def test_list_newest_first():
    response = assert_example("list-newest-first")
    ids = [item["id"] for item in response["items"]]
    assert ids == ["00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000001"]
    assert all("schedule" not in item for item in response["items"])


def test_list_only_own_client(app):
    app.save(BODY, CLIENT_A)
    app.save(BODY, CLIENT_B)
    items = app.get(f"{LIST}?client_id={CLIENT_A}").json()["items"]
    assert [item["id"] for item in items] == ["00000000-0000-4000-8000-000000000001"]


def test_list_limit_applies(app):
    for _ in range(3):
        app.save(BODY)
    assert len(app.get(f"{LIST}?client_id={CLIENT_A}&limit=2").json()["items"]) == 2
    assert len(app.get(f"{LIST}?client_id={CLIENT_A}").json()["items"]) == 3


def test_list_limit_syntax(app):
    for _ in range(7):
        app.save(BODY)
    ok = app.get(f"{LIST}?client_id={CLIENT_A}&limit=05")
    assert ok.status_code == 200 and len(ok.json()["items"]) == 5
    for limit in ["%2B5", "%205", "1.0", "", "0", "000", "51", "99999999999999999999", "abc"]:
        response = app.get(f"{LIST}?client_id={CLIENT_A}&limit={limit}")
        assert response.status_code == 422, limit
        assert response.json() == {"errors": {"limit": "Limit must be between 1 and 50"}}, limit


def test_list_repeated_parameters_rejected(app):
    twice_limit = app.get(f"{LIST}?client_id={CLIENT_A}&limit=2&limit=3")
    assert twice_limit.status_code == 422 and "limit" in twice_limit.json()["errors"]
    twice_client = app.get(f"{LIST}?client_id={CLIENT_A}&client_id={CLIENT_A}")
    assert twice_client.status_code == 422 and "client_id" in twice_client.json()["errors"]


def test_list_bad_client_id(app):
    for query in ["limit=5", "client_id=x&limit=5"]:
        response = app.get(f"{LIST}?{query}")
        assert response.status_code == 422, query
        assert response.json() == {"errors": {"client_id": "Invalid client id"}}, query


def test_list_database_unavailable():
    assert assert_example("list-database-unavailable") == {"error": "database_unavailable"}


def test_saved_extra_payment_roundtrip():
    response = assert_example("saved-extra-payment-roundtrip")
    (item,) = response["items"]
    assert item["input"]["extra_monthly_cents"] == 20000
    assert item["extra_payment"] == {
        "months_to_payoff": 161,
        "months_saved": 79,
        "total_interest_cents": 2926329,
        "interest_saved_cents": 1617192,
    }


def test_functional_text_to_euro_100k_4pct_20y(app):
    response = app.post(CALC, body(loan="100000", annual_rate_percent="4", term_years="20"))
    assert response.json()["result"] == {
        "monthly_payment_cents": 60598,
        "total_paid_cents": 14543520,
        "total_interest_cents": 4543520,
    }


def test_functional_zero_rate_120k_10y(app):
    response = app.post(CALC, body(loan="120000", annual_rate_percent="0", term_years="10"))
    assert response.json()["result"] == {
        "monthly_payment_cents": 100000,
        "total_paid_cents": 12000000,
        "total_interest_cents": 0,
    }


def test_examples_match_live_responses():
    documented = {
        "health-ok", "health-database-unavailable", "calculate-100k-4pct-20y",
        "calculate-100k-4pct-20y-extra-200", "calculate-100k-4pct-20y-extra-equals-loan",
        "calculate-120k-0pct-10y", "calculate-120k-4pct-20y", "calculate-100k-4pct-25y",
        "calculate-250k-4.5pct-25y", "calculate-422-empty-loan",
        "calculate-422-empty-loan-and-rate-30", "calculate-422-rate-30",
        "calculate-422-decimal-comma", "calculate-422-extra-above-loan",
        "calculate-422-missing-fields", "save-100k-4pct-20y", "save-database-unavailable",
        "list-empty", "list-newest-first", "list-database-unavailable",
        "saved-extra-payment-roundtrip",
    }  # fmt: skip
    assert set(example_files()) == documented
    for name in example_files():
        assert_example(name)
