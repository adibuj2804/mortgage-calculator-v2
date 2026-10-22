import ast
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app"


def imported_modules(folder: str) -> set[str]:
    names: set[str] = set()
    for path in (APP / folder).rglob("*.py"):
        for node in ast.walk(ast.parse(path.read_text())):
            if isinstance(node, ast.Import):
                names.update(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                names.add(node.module)
    return names


def test_calc_imports_no_other_layer():
    forbidden = (
        "app.service", "app.repository", "app.supabase_repository", "app.web", "app.config",
        "httpx", "fastapi", "os",
    )  # fmt: skip
    for name in imported_modules("calc"):
        assert not any(name == bad or name.startswith(bad + ".") for bad in forbidden), name


def test_web_does_not_import_supabase_repository():
    for name in imported_modules("web"):
        assert name != "app.supabase_repository" and name != "httpx", name
