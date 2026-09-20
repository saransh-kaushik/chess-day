"""
Pydantic schemas for Move.
"""

from datetime import datetime

from pydantic import BaseModel


class MoveCreate(BaseModel):
    """Used internally when persisting a move."""

    game_id: str
    move_number: int
    color: str  # white | black
    uci: str
    san: str
    fen_before: str
    fen_after: str
    clock_remaining: float | None = None


class MoveOut(BaseModel):
    """Public representation of a single move."""

    id: str
    game_id: str
    move_number: int
    color: str
    uci: str
    san: str
    fen_before: str
    fen_after: str
    timestamp: datetime
    clock_remaining: float | None

    model_config = {"from_attributes": True}
