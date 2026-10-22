from fastapi import FastAPI

from app.config import Settings
from app.repository import CalculationRepository, InMemoryRepository
from app.service import CalculationService
from app.supabase_repository import UnavailableRepository
from app.web import create_app


def make_repository(settings: Settings) -> CalculationRepository:
    if settings.storage == "memory":
        return InMemoryRepository()
    return UnavailableRepository()


def create_default_app() -> FastAPI:
    settings = Settings.from_env()
    service = CalculationService(make_repository(settings))
    return create_app(service, list(settings.allowed_origins))


app = create_default_app()
