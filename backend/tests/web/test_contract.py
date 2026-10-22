import json
from pathlib import Path

from app.repository import InMemoryRepository
from tests.conftest import App

OPENAPI = Path(__file__).resolve().parents[3] / "api" / "openapi.json"


def test_openapi_matches_committed_file():
    live = App(InMemoryRepository()).client.app.openapi()
    assert live == json.loads(OPENAPI.read_text())
