"""Write the OpenAPI file of the API. Run from backend/: uv run python scripts/export_openapi.py"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.repository import InMemoryRepository  # noqa: E402
from app.service import CalculationService  # noqa: E402
from app.web import create_app  # noqa: E402

TARGET = Path(__file__).resolve().parents[2] / "api" / "openapi.json"

if __name__ == "__main__":
    app = create_app(CalculationService(InMemoryRepository()), ["http://localhost:5173"])
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n")
    print(f"wrote {TARGET}")
