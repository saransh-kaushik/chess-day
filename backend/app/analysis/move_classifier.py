"""
Move Classifier — categorises each move based on centipawn eval loss.

Classification thresholds are loaded from app.config.settings to keep
them centrally configurable without touching analysis code.
"""

from __future__ import annotations

from enum import Enum

from app.config import settings

# Mate score sentinel — we won't penalise forcing checkmate
_MATE_CP = 30_000
# If a position is already lost/won by this margin, be lenient
_ALREADY_LOSING_THRESHOLD_CP = 500.0  # 5 pawns


class MoveClassification(str, Enum):
    """Ordered severity of a move quality classification."""

    BEST = "BEST"
    GOOD = "GOOD"
    INACCURACY = "INACCURACY"
    MISTAKE = "MISTAKE"
    BLUNDER = "BLUNDER"


class MoveClassifier:
    """
    Classify individual moves by comparing engine evaluations before/after.

    All scores are centipawns from White's perspective (positive = White ahead).
    Thresholds are in full pawn units (1 pawn = 100 cp); converted internally.
    """

    def __init__(self) -> None:
        # Convert pawn thresholds to centipawns once
        self._inaccuracy_cp = settings.INACCURACY_THRESHOLD * 100
        self._mistake_cp = settings.MISTAKE_THRESHOLD * 100
        self._blunder_cp = settings.BLUNDER_THRESHOLD * 100

    def _eval_loss_from_mover_pov(
        self,
        eval_before_cp: float,
        eval_after_cp: float,
        color: str,
    ) -> float:
        """
        Compute centipawn loss from the perspective of the side that moved.

        A positive loss means the position got worse for the mover.
        """
        if color == "white":
            # White wants higher eval; loss = drop in eval
            return eval_before_cp - eval_after_cp
        else:
            # Black wants lower eval; loss = increase in eval (from White's POV)
            return eval_after_cp - eval_before_cp

    def classify(
        self,
        eval_before: float,
        eval_after: float,
        color: str,
        best_move_uci: str,
        played_move_uci: str,
        is_checkmate: bool = False,
    ) -> MoveClassification:
        """
        Classify a move based on evaluation change.

        Args:
            eval_before: Engine score (cp, White POV) before the move.
            eval_after: Engine score (cp, White POV) after the move.
            color: 'white' or 'black' — the side that moved.
            best_move_uci: The engine's top choice.
            played_move_uci: The move that was actually played.
            is_checkmate: True if the move delivered checkmate.

        Returns:
            MoveClassification enum value.
        """
        # Delivering checkmate is always the best move
        if is_checkmate:
            return MoveClassification.BEST

        # The mover played the engine's top choice
        if played_move_uci == best_move_uci:
            return MoveClassification.BEST

        loss_cp = self._eval_loss_from_mover_pov(eval_before, eval_after, color)

        # Avoid over-penalising moves in already-lost positions.
        # If you're already losing by 5+ pawns, a "mistake" threshold should
        # be relaxed — it's hard to find the only saving move.
        mover_eval_before = eval_before if color == "white" else -eval_before
        already_losing = mover_eval_before < -_ALREADY_LOSING_THRESHOLD_CP

        if already_losing:
            # Soften thresholds by 50% in losing positions
            inaccuracy_cp = self._inaccuracy_cp * 1.5
            mistake_cp = self._mistake_cp * 1.5
            blunder_cp = self._blunder_cp * 1.5
        else:
            inaccuracy_cp = self._inaccuracy_cp
            mistake_cp = self._mistake_cp
            blunder_cp = self._blunder_cp

        if loss_cp < inaccuracy_cp:
            return MoveClassification.GOOD
        if loss_cp < mistake_cp:
            return MoveClassification.INACCURACY
        if loss_cp < blunder_cp:
            return MoveClassification.MISTAKE
        return MoveClassification.BLUNDER
