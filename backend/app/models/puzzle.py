"""
Puzzle ORM Model — tactical puzzles for the Puzzles feature.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Puzzle(Base):
    __tablename__ = "puzzles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    fen: Mapped[str] = mapped_column(Text, nullable=False)
    # List of one-or-more UCI strings, e.g. ["e2e4"] for single-move puzzles.
    solution_uci: Mapped[list] = mapped_column(JSON, nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True, default=1200)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="seed")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Puzzle id={self.id!r} rating={self.rating}>"
