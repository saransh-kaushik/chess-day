"""
Chess Day Backend — Application Configuration
Uses pydantic-settings to load from environment / .env file.
"""

import warnings

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./chess.db"

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "changeme-super-secret-key"
    DEBUG: bool = True
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ── Stockfish ─────────────────────────────────────────────────────────────
    STOCKFISH_PATH: str = "/usr/games/stockfish"
    STOCKFISH_DEPTH: int = 14
    STOCKFISH_ANALYSIS_DEPTH: int = 14

    # ── Move classification thresholds (in pawns / full units) ────────────────
    # These are compared against centipawn-loss divided by 100.
    INACCURACY_THRESHOLD: float = 0.5   # ≥ 0.50 pawns → inaccuracy
    MISTAKE_THRESHOLD: float = 1.5      # ≥ 1.50 pawns → mistake
    BLUNDER_THRESHOLD: float = 3.0      # ≥ 3.00 pawns → blunder

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

if settings.SECRET_KEY == "changeme-super-secret-key":
    if not settings.DEBUG:
        raise RuntimeError(
            "SECRET_KEY is still set to the insecure default. Set a real SECRET_KEY "
            "before running with DEBUG=False."
        )
    warnings.warn(
        "SECRET_KEY is set to the insecure default value. This is only safe for local "
        "development (DEBUG=True); set a real SECRET_KEY before deploying.",
        stacklevel=1,
    )
