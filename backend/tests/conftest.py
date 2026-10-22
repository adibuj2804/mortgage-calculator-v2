import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.repository import InMemoryRepository
from app.service import CalculationService
from app.supabase_repository import UnavailableRepository
from app.web import create_app

EXAMPLES = Path(__file__).resolve().parents[2] / "api" / "examples"
CLIENT_A = "11111111-1111-4111-8111-111111111111"
CLIENT_B = "22222222-2222-4222-8222-222222222222"
BODY = {
    "loan": "100000",
    "annual_rate_percent": "4",
    "term_years": "20",
    "extra_monthly_payment": "",
}


class App:
    def __init__(self, repository, origins=None, raise_exceptions=False):
        self.repository = repository
        self.service = CalculationService(repository)
        app = create_app(self.service, origins or ["http://localhost:5173"])
        self.client = TestClient(app, raise_server_exceptions=raise_exceptions)

    def post(self, path, body=None, **kwargs):
        if body is not None and "content" not in kwargs:
            kwargs["json"] = body
        return self.client.post(path, **kwargs)

    def get(self, path, **kwargs):
        return self.client.get(path, **kwargs)

    def save(self, body, client_id=CLIENT_A):
        return self.post("/api/v1/calculations", {**body, "client_id": client_id})


@pytest.fixture
def app():
    return App(InMemoryRepository())


@pytest.fixture
def offline_app():
    return App(UnavailableRepository())


def load_example(name):
    return json.loads((EXAMPLES / f"{name}.json").read_text())


def example_files():
    return sorted(path.stem for path in EXAMPLES.glob("*.json"))
