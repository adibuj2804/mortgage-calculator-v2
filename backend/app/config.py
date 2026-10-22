import os
from collections.abc import Mapping
from dataclasses import dataclass

DEFAULT_ORIGINS = ("http://localhost:5173",)
STORAGES = ("supabase", "memory")


@dataclass(frozen=True)
class Settings:
    storage: str
    supabase_url: str | None
    supabase_key: str | None
    allowed_origins: tuple[str, ...]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "Settings":
        env = os.environ if env is None else env
        storage = env.get("STORAGE", "supabase")
        if storage not in STORAGES:
            raise ValueError(f"STORAGE must be one of {STORAGES}, got {storage!r}")
        if "ALLOWED_ORIGINS" in env:
            origins = tuple(o.strip() for o in env["ALLOWED_ORIGINS"].split(",") if o.strip())
        else:
            origins = DEFAULT_ORIGINS
        return cls(
            storage=storage,
            supabase_url=env.get("SUPABASE_URL") or None,
            supabase_key=env.get("SUPABASE_SECRET_KEY") or None,
            allowed_origins=origins,
        )
