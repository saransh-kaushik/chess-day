"""
User ORM Model
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(254), unique=True, nullable=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(256), nullable=True)
    is_guest: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    # Relationships
    stats: Mapped["PlayerStats"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "PlayerStats", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    games_as_white: Mapped[list["Game"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Game", foreign_keys="Game.white_player_id", back_populates="white_player"
    )
    games_as_black: Mapped[list["Game"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Game", foreign_keys="Game.black_player_id", back_populates="black_player"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} username={self.username!r} guest={self.is_guest}>"
