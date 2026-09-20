"""
Alembic Environment Configuration

Reads DATABASE_URL from the environment (or .env file) and applies it
to the migration context. Imports all models so Alembic can detect them
for autogenerate.
"""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Path setup ────────────────────────────────────────────────────────────────
# Add the backend root to sys.path so app imports work
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# ── Load .env (optional, for local dev) ──────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass  # dotenv not required in CI/prod

# ── Import models so Alembic can detect them ──────────────────────────────────
from app.database import Base
import app.models  # noqa: F401 — registers all ORM models onto Base.metadata

# ── Alembic Config ────────────────────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url from DATABASE_URL environment variable
database_url = os.environ.get("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ── Migration runners ─────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode (no DB connection required).
    Only generates SQL scripts.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode (connects to the database).
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
