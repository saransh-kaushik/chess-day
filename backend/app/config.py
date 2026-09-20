"""
Chess Day Backend — Application Configuration
Uses pydantic-settings to load from environment / .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./chess.db"

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "changeme-super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ── Stockfish ─────────────────────────────────────────────────────────────
    STOCKFISH_PATH: str = "/usr/local/bin/stockfish"
    STOCKFISH_DEPTH: int = 20
    STOCKFISH_ANALYSIS_DEPTH: int = 25

    # ── Move classification thresholds (in pawns / full units) ────────────────
    # These are compared against centipawn-loss divided by 100.
    INACCURACY_THRESHOLD: float = 0.5   # ≥ 0.50 pawns → inaccuracy
    MISTAKE_THRESHOLD: float = 1.5      # ≥ 1.50 pawns → mistake
    BLUNDER_THRESHOLD: float = 3.0      # ≥ 3.00 pawns → blunder

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
