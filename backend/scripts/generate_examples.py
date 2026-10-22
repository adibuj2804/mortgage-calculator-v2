"""Write the example files of the API contract (api/examples/*.json) from the running code.

Run from backend/: uv run python scripts/generate_examples.py
The numbers in these files are checked against the independent reference scripts in docs/v2/.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.repository import InMemoryRepository  # noqa: E402
from app.service import CalculationService  # noqa: E402
from app.supabase_repository import UnavailableRepository  # noqa: E402
from app.web import create_app  # noqa: E402

TARGET = Path(__file__).resolve().parents[2] / "api" / "examples"
CLIENT = "11111111-1111-4111-8111-111111111111"
BASE = {
    "loan": "100000",
    "annual_rate_percent": "4",
    "term_years": "20",
    "extra_monthly_payment": "",
}
LIST_PATH = f"/api/v1/calculations?client_id={CLIENT}&limit=20"
SAVE_PATH = "/api/v1/calculations"
CALC_PATH = "/api/v1/calculate"
ZERO_RATE = {**BASE, "loan": "120000", "annual_rate_percent": "0", "term_years": "10"}
OFFLINE = {"repository": "unavailable"}


def post(path, body, setup=None):
    return {"setup": setup or {}, "request": {"method": "POST", "path": path, "body": body}}


def get(path, setup=None):
    return {"setup": setup or {}, "request": {"method": "GET", "path": path, "body": None}}


EXAMPLES = {
    "health-ok": get("/api/v1/health"),
    "health-database-unavailable": get("/api/v1/health", OFFLINE),
    "calculate-100k-4pct-20y": post(CALC_PATH, BASE),
    "calculate-100k-4pct-20y-extra-200": post(CALC_PATH, {**BASE, "extra_monthly_payment": "200"}),
    "calculate-100k-4pct-20y-extra-equals-loan": post(
        CALC_PATH, {**BASE, "extra_monthly_payment": "100000"}
    ),
    "calculate-120k-0pct-10y": post(CALC_PATH, ZERO_RATE),
    "calculate-120k-4pct-20y": post(CALC_PATH, {**BASE, "loan": "120000"}),
    "calculate-100k-4pct-25y": post(CALC_PATH, {**BASE, "term_years": "25"}),
    "calculate-250k-4.5pct-25y": post(
        CALC_PATH, {**BASE, "loan": "250000", "annual_rate_percent": "4.5", "term_years": "25"}
    ),
    "calculate-422-empty-loan": post(CALC_PATH, {**BASE, "loan": ""}),
    "calculate-422-empty-loan-and-rate-30": post(
        CALC_PATH, {**BASE, "loan": "", "annual_rate_percent": "30"}
    ),
    "calculate-422-rate-30": post(CALC_PATH, {**BASE, "annual_rate_percent": "30"}),
    "calculate-422-decimal-comma": post(CALC_PATH, {**BASE, "annual_rate_percent": "3,75"}),
    "calculate-422-extra-above-loan": post(
        CALC_PATH, {**BASE, "extra_monthly_payment": "100000.01"}
    ),
    "calculate-422-missing-fields": post(CALC_PATH, {}),
    "save-100k-4pct-20y": post(SAVE_PATH, {**BASE, "client_id": CLIENT}),
    "save-database-unavailable": post(SAVE_PATH, {**BASE, "client_id": CLIENT}, OFFLINE),
    "list-empty": get(LIST_PATH),
    "list-newest-first": get(
        LIST_PATH,
        {"saved": [{**BASE, "client_id": CLIENT}, {**ZERO_RATE, "client_id": CLIENT}]},
    ),
    "list-database-unavailable": get(LIST_PATH, OFFLINE),
    "saved-extra-payment-roundtrip": get(
        LIST_PATH, {"saved": [{**BASE, "extra_monthly_payment": "200", "client_id": CLIENT}]}
    ),
}


def run(example):
    setup = example["setup"]
    repository = UnavailableRepository() if setup.get("repository") else InMemoryRepository()
    client = TestClient(create_app(CalculationService(repository), ["http://localhost:5173"]))
    for saved in setup.get("saved", []):
        assert client.post(SAVE_PATH, json=saved).status_code == 201
    request = example["request"]
    if request["method"] == "GET":
        return client.get(request["path"])
    return client.post(request["path"], json=request["body"])


if __name__ == "__main__":
    TARGET.mkdir(parents=True, exist_ok=True)
    for name, example in EXAMPLES.items():
        response = run(example)
        document = {
            "name": name,
            **example,
            "status": response.status_code,
            "response": response.json(),
        }
        (TARGET / f"{name}.json").write_text(json.dumps(document, indent=2) + "\n")
        print(f"{name}: {response.status_code}")
