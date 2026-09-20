"""
Pydantic schemas for analysis results.
These are the rich internal / API objects returned by the review engine.
"""

from typing import Any

from pydantic import BaseModel, Field


class OpeningInfo(BaseModel):
    """ECO opening information."""

    name: str
    eco: str
    variation: str | None = None


class TacticalEvent(BaseModel):
    """A single detected tactical pattern."""

    pattern: str  # FORK, PIN, SKEWER, etc.
    description: str
    square: str | None = None
    piece: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class PositionalEvent(BaseModel):
    """A single detected positional issue."""

    pattern: str  # POOR_DEVELOPMENT, KING_SAFETY, etc.
    description: str
    extra: dict[str, Any] = Field(default_factory=dict)


class EndgameEvent(BaseModel):
    """A detected endgame theme."""

    pattern: str  # PASSED_PAWN, KING_ACTIVITY, etc.
    description: str
    square: str | None = None


class MoveAnalysis(BaseModel):
    """Full analysis for one half-move (ply)."""

    move_number: int
    color: str  # white | black
    uci: str
    san: str
    fen_before: str
    fen_after: str

    # Stockfish evaluations (centipawns, positive = White advantage)
    eval_before: float | None = None   # score before move
    eval_after: float | None = None    # score after move
    best_move_uci: str | None = None   # engine's preferred move
    eval_loss: float | None = None     # eval_before − eval_after (from mover's POV)

    # Quality
    classification: str | None = None  # BEST | GOOD | INACCURACY | MISTAKE | BLUNDER
    accuracy: float | None = None       # 0-100 for this move

    # Narrative
    explanation: str | None = None

    # Detected patterns
    tactical_events: list[TacticalEvent] = Field(default_factory=list)
    positional_events: list[PositionalEvent] = Field(default_factory=list)
    endgame_events: list[EndgameEvent] = Field(default_factory=list)


class PlayerReviewSummary(BaseModel):
    """Per-player summary within a ReviewResult."""

    color: str
    accuracy: float | None
    blunders: int = 0
    mistakes: int = 0
    inaccuracies: int = 0


class ReviewResult(BaseModel):
    """Full output of the review engine for one game."""

    game_id: str
    opening: OpeningInfo | None = None
    analysis_depth: int
    white: PlayerReviewSummary
    black: PlayerReviewSummary
    moves: list[MoveAnalysis]
