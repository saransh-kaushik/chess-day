"""
Pydantic schemas for analysis results.
These are the rich internal / API objects returned by the review engine.
"""

from typing import Any

from pydantic import BaseModel, Field, computed_field


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

    @computed_field
    @property
    def moveNumber(self) -> int:
        return self.move_number

    @computed_field
    @property
    def fenBefore(self) -> str:
        return self.fen_before

    @computed_field
    @property
    def fenAfter(self) -> str:
        return self.fen_after

    @computed_field
    @property
    def evalBefore(self) -> float:
        return self.eval_before if self.eval_before is not None else 0.0

    @computed_field
    @property
    def evalAfter(self) -> float:
        return self.eval_after if self.eval_after is not None else 0.0

    @computed_field
    @property
    def evalLoss(self) -> float:
        return self.eval_loss if self.eval_loss is not None else 0.0

    @computed_field
    @property
    def bestMove(self) -> str:
        return self.best_move_uci or ""

    @computed_field
    @property
    def principalVariation(self) -> list[str]:
        return []

    @computed_field
    @property
    def tacticalEvent(self) -> dict[str, Any] | None:
        if self.tactical_events:
            ev = self.tactical_events[0]
            return {
                "type": ev.pattern,
                "piece": ev.piece,
                "square": ev.square,
                "description": ev.description,
            }
        return None


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

    @computed_field
    @property
    def gameId(self) -> str:
        return self.game_id

    @computed_field
    @property
    def openingName(self) -> str | None:
        return self.opening.name if self.opening else None

    @computed_field
    @property
    def openingEco(self) -> str | None:
        return self.opening.eco if self.opening else None

    @computed_field
    @property
    def accuracy(self) -> dict[str, float]:
        return {
            "white": self.white.accuracy if self.white.accuracy is not None else 0.0,
            "black": self.black.accuracy if self.black.accuracy is not None else 0.0,
        }

    @computed_field
    @property
    def blunders(self) -> dict[str, int]:
        return {"white": self.white.blunders, "black": self.black.blunders}

    @computed_field
    @property
    def mistakes(self) -> dict[str, int]:
        return {"white": self.white.mistakes, "black": self.black.mistakes}

    @computed_field
    @property
    def inaccuracies(self) -> dict[str, int]:
        return {"white": self.white.inaccuracies, "black": self.black.inaccuracies}

    @computed_field
    @property
    def analysisDepth(self) -> int:
        return self.analysis_depth
