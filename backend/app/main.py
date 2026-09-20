"""
Chess Day — FastAPI Application Entrypoint

Registers all routers, configures CORS, and exposes health/info endpoints.
"""

from __future__ import annotations

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, games, online, analysis, stats
from app.config import settings
from app.database import create_all_tables

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# ── Application ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Chess Day API",
    version="1.0.0",
    description=(
        "Backend for Chess Day — a full-featured chess platform with "
        "local/bot/online games, Stockfish analysis, and player statistics."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup hook ──────────────────────────────────────────────────────────────

@app.on_event("startup")
def on_startup() -> None:
    """
    On startup, ensure all database tables exist.

    In production, tables should be managed by Alembic migrations.
    This fallback is provided for development convenience.
    """
    create_all_tables()


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(games.router)
app.include_router(online.router)
app.include_router(analysis.router)
app.include_router(stats.router)

# ── Utility endpoints ─────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
def health_check() -> dict[str, str]:
    """Return a simple health-check response."""
    return {"status": "ok"}


@app.get("/", tags=["meta"])
def root() -> dict[str, str]:
    """Return API info and links."""
    return {
        "name": "Chess Day API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
