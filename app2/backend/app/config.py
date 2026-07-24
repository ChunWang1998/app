from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://kaohsiung:kaohsiung@127.0.0.1:5432/kaohsiung_price"
    cors_origins: str = "*"

    # Kaohsiung approximate bounding box (demo fallback when reverse-geo fails)
    kh_lat_min: float = 22.45
    kh_lat_max: float = 23.30
    kh_lng_min: float = 120.10
    kh_lng_max: float = 120.90


@lru_cache
def get_settings() -> Settings:
    return Settings()
