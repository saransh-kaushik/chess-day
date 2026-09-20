"""
PlayerStats ORM Model — aggregated statistics per registered user.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PlayerStats(Base):
    __tablename__ = "player_stats"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Game results
    games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    losses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    draws: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Accuracy
    avg_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Error counts (total across all reviewed games)
    total_blunders: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_mistakes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_inaccuracies: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Category breakdown
    tactical_mistakes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    positional_mistakes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    # Relationship
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="stats"
    )

    def __repr__(self) -> str:
        return (
            f"<PlayerStats user={self.user_id!r} "
            f"played={self.games_played} avg_acc={self.avg_accuracy}>"
        )
