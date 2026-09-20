"""
Chess Day Backend — Database Setup
Synchronous SQLAlchemy engine + session factory, compatible with serverless.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────
connect_args: dict = {}
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite requires check_same_thread=False for use with FastAPI
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

# Enable WAL mode for SQLite (better concurrent read performance)
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _connection_record):  # noqa: ANN001
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ── Declarative base ─────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


# ── Convenience helper ────────────────────────────────────────────────────────
def create_all_tables() -> None:
    """Create all tables (used in tests / first-run fallback)."""
    Base.metadata.create_all(bind=engine)
