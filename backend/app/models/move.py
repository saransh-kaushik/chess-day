"""
Move ORM Model
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Move(Base):
    __tablename__ = "moves"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    game_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    move_number: Mapped[int] = mapped_column(Integer, nullable=False)  # half-move (ply) index
    color: Mapped[str] = mapped_column(String(8), nullable=False)  # white | black
    uci: Mapped[str] = mapped_column(String(8), nullable=False)   # e.g. e2e4
    san: Mapped[str] = mapped_column(String(16), nullable=False)   # e.g. e4
    fen_before: Mapped[str] = mapped_column(Text, nullable=False)
    fen_after: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    clock_remaining: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationship
    game: Mapped["Game"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Game", back_populates="moves"
    )

    def __repr__(self) -> str:
        return f"<Move game={self.game_id!r} #{self.move_number} {self.color} {self.san!r}>"
