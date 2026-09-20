"""
Game ORM Model
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

STANDARD_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Players — nullable for guest support
    white_player_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    black_player_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    white_guest_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    black_guest_name: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Game metadata
    mode: Mapped[str] = mapped_column(String(16), nullable=False)  # local | bot | online
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="waiting"
    )  # waiting | active | completed | abandoned

    # Board state
    initial_fen: Mapped[str] = mapped_column(Text, nullable=False, default=STANDARD_FEN)
    current_fen: Mapped[str] = mapped_column(Text, nullable=False, default=STANDARD_FEN)
    pgn: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Result
    result: Mapped[str | None] = mapped_column(String(8), nullable=True)  # 1-0 | 0-1 | 1/2-1/2 | *

    # Time control — stored as JSON {"initial": 600, "increment": 5}
    time_control: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    white_player: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[white_player_id], back_populates="games_as_white"
    )
    black_player: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[black_player_id], back_populates="games_as_black"
    )
    moves: Mapped[list["Move"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Move", back_populates="game", order_by="Move.move_number", cascade="all, delete-orphan"
    )
    review: Mapped["Review | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Review", back_populates="game", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Game id={self.id!r} mode={self.mode!r} status={self.status!r}>"
