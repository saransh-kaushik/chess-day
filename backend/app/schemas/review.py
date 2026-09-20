"""
Pydantic schemas for Review.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ReviewOut(BaseModel):
    """Public representation of a game review."""

    id: str
    game_id: str
    accuracy_white: float | None
    accuracy_black: float | None
    blunders_white: int
    mistakes_white: int
    inaccuracies_white: int
    blunders_black: int
    mistakes_black: int
    inaccuracies_black: int
    moves_analysis: list[dict[str, Any]] | None
    opening_name: str | None
    opening_eco: str | None
    created_at: datetime
    analysis_depth: int

    model_config = {"from_attributes": True}
