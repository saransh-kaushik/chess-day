"""
Pydantic schemas for Game.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TimeControl(BaseModel):
    initial: int = Field(..., description="Initial time in seconds")
    increment: int = Field(0, description="Increment per move in seconds")


class GameCreate(BaseModel):
    """Request body for POST /games."""

    mode: str = Field(..., pattern="^(local|bot|online)$")
    white_guest_name: str | None = None
    black_guest_name: str | None = None
    time_control: TimeControl | None = None
    initial_fen: str | None = None  # if None, use standard start position


class GameOut(BaseModel):
    """Full game state response."""

    id: str
    white_player_id: str | None
    black_player_id: str | None
    white_guest_name: str | None
    black_guest_name: str | None
    mode: str
    status: str
    initial_fen: str
    current_fen: str
    pgn: str
    result: str | None
    time_control: dict[str, Any] | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class GameListOut(BaseModel):
    """Paginated list response for GET /games."""

    games: list[GameOut]
    total: int
    page: int
    page_size: int


class GameCompleteRequest(BaseModel):
    """Request body for POST /games/{game_id}/complete."""

    pgn: str
    result: str = Field(..., pattern=r"^(1-0|0-1|1/2-1/2|\*)$")
    current_fen: str | None = None
