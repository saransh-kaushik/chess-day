"""
Pydantic schemas for Puzzle.
"""

from pydantic import BaseModel, Field


class PuzzleOut(BaseModel):
    """Public puzzle representation — never exposes the solution."""

    id: str
    fen: str
    rating: int | None
    source: str

    model_config = {"from_attributes": True}


class PuzzleAttemptRequest(BaseModel):
    """Request body for POST /puzzles/{puzzle_id}/attempt."""

    uci: str = Field(..., min_length=4, max_length=6)


class PuzzleAttemptResult(BaseModel):
    """Response for a puzzle attempt — reveals the solution either way."""

    correct: bool
    solution: list[str]
