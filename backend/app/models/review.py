"""
Review ORM Model — stores a full Stockfish game review.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    game_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("games.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Accuracy (0-100 scale)
    accuracy_white: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy_black: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Move quality counts — white
    blunders_white: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mistakes_white: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    inaccuracies_white: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Move quality counts — black
    blunders_black: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mistakes_black: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    inaccuracies_black: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Full per-move analysis array (serialised JSON)
    moves_analysis: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Opening info
    opening_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    opening_eco: Mapped[str | None] = mapped_column(String(8), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    analysis_depth: Mapped[int] = mapped_column(Integer, nullable=False, default=20)

    # Relationship
    game: Mapped["Game"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Game", back_populates="review"
    )

    def __repr__(self) -> str:
        return (
            f"<Review game={self.game_id!r} "
            f"white={self.accuracy_white} black={self.accuracy_black}>"
        )
