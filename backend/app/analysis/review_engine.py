"""
Review Engine — orchestrates the full game analysis pipeline.

Pipeline:
  1. Load Game + Moves from DB
  2. Run StockfishEngine.analyse_game()
  3. For each move: classify, detect tactical/positional/endgame events
  4. Detect opening via ECO database
  5. Compute per-player accuracy
  6. Build ReviewResult
  7. Fill explanation templates
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.analysis.accuracy import compute_game_accuracy, eval_loss_to_accuracy
from app.analysis.endgame_detector import EndgameDetector
from app.analysis.move_classifier import MoveClassification, MoveClassifier
from app.analysis.opening_detector import detect_opening
from app.analysis.positional_detector import PositionalDetector
from app.analysis.stockfish_engine import StockfishEngine
from app.analysis.tactical_detector import TacticalDetector
from app.config import settings
from app.models.game import Game
from app.models.move import Move
from app.schemas.analysis import (
    EndgameEvent,
    MoveAnalysis,
    OpeningInfo,
    PlayerReviewSummary,
    PositionalEvent,
    ReviewResult,
    TacticalEvent,
)
from app.templates.explanations import fill_template

logger = logging.getLogger(__name__)

_MATE_CP = 30_000


class ReviewEngine:
    """
    Orchestrates the full game review pipeline.

    A new instance should be created per request to avoid shared state.
    """

    def __init__(self) -> None:
        self._classifier = MoveClassifier()
        self._tactical = TacticalDetector()
        self._positional = PositionalDetector()
        self._endgame = EndgameDetector()

    def analyse_game(
        self,
        game_id: str,
        db: Session,
        depth: int | None = None,
    ) -> ReviewResult:
        """
        Run a full game review and return a structured ReviewResult.

        Args:
            game_id: UUID of the game to analyse.
            db: Active SQLAlchemy session.

        Returns:
            ReviewResult with per-move analysis and summary statistics.

        Raises:
            ValueError: if the game or moves are not found.
        """
        # ── 1. Load from DB ───────────────────────────────────────────────────
        game: Game | None = db.query(Game).filter(Game.id == game_id).first()
        if game is None:
            raise ValueError(f"Game {game_id!r} not found")

        moves: list[Move] = (
            db.query(Move)
            .filter(Move.game_id == game_id)
            .order_by(Move.move_number)
            .all()
        )

        if not moves and game.pgn:
            import io
            import uuid
            import chess
            import chess.pgn

            try:
                parsed = chess.pgn.read_game(io.StringIO(game.pgn))
                if parsed:
                    board = parsed.board()
                    ply = 0
                    for node in parsed.mainline():
                        fen_before = board.fen()
                        move_obj = node.move
                        san = board.san(move_obj)
                        uci = move_obj.uci()
                        color = "white" if board.turn == chess.WHITE else "black"
                        board.push(move_obj)
                        fen_after = board.fen()

                        m = Move(
                            id=str(uuid.uuid4()),
                            game_id=game.id,
                            move_number=ply,
                            color=color,
                            uci=uci,
                            san=san,
                            fen_before=fen_before,
                            fen_after=fen_after,
                        )
                        db.add(m)
                        moves.append(m)
                        ply += 1
                    db.commit()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Could not parse PGN into moves for review: %s", exc)

        if not moves:
            # Return empty review for games with no moves
            return ReviewResult(
                game_id=game_id,
                opening=None,
                analysis_depth=settings.STOCKFISH_ANALYSIS_DEPTH,
                white=PlayerReviewSummary(color="white", accuracy=None),
                black=PlayerReviewSummary(color="black", accuracy=None),
                moves=[],
            )

        uci_sequence = [m.uci for m in moves]
        san_sequence = [m.san for m in moves]

        # ── 2. Run Stockfish ──────────────────────────────────────────────────
        analysis_depth = depth or settings.STOCKFISH_ANALYSIS_DEPTH
        position_analyses = self._run_stockfish(uci_sequence, game.initial_fen, analysis_depth)

        # ── 3 & 4. Per-move analysis ──────────────────────────────────────────
        move_analyses: list[MoveAnalysis] = []
        uci_history: list[str] = []

        for i, move in enumerate(moves):
            analysis_before = position_analyses[i]
            analysis_after = position_analyses[i + 1]

            # Eval loss from mover's perspective
            color = move.color
            if color == "white":
                eval_loss = analysis_before.score_cp - analysis_after.score_cp
            else:
                eval_loss = analysis_after.score_cp - analysis_before.score_cp

            eval_loss = max(0.0, eval_loss)  # Never negative

            # Accuracy for this move
            move_accuracy = eval_loss_to_accuracy(eval_loss)

            # Classification
            is_checkmate = analysis_after.score_cp >= _MATE_CP
            classification = self._classifier.classify(
                eval_before=analysis_before.score_cp,
                eval_after=analysis_after.score_cp,
                color=color,
                best_move_uci=analysis_before.best_move or "",
                played_move_uci=move.uci,
                is_checkmate=is_checkmate,
            )

            # Tactical events
            tactical_events = self._tactical.detect(
                fen_before=move.fen_before,
                fen_after=move.fen_after,
                played_uci=move.uci,
                color=color,
            )

            # Positional events
            uci_history.append(move.uci)
            positional_events = self._positional.detect(
                fen_before=move.fen_before,
                fen_after=move.fen_after,
                played_uci=move.uci,
                color=color,
                move_history=list(uci_history),
            )

            # Endgame events
            endgame_events = self._endgame.detect(
                fen_before=move.fen_before,
                fen_after=move.fen_after,
                played_uci=move.uci,
                color=color,
            )

            # Explanation template
            explanation = self._build_explanation(
                classification=classification,
                eval_loss=eval_loss,
                best_move_uci=analysis_before.best_move,
                tactical_events=tactical_events,
                positional_events=positional_events,
            )

            move_analyses.append(MoveAnalysis(
                move_number=(i // 2) + 1,
                color=color,
                uci=move.uci,
                san=move.san,
                fen_before=move.fen_before,
                fen_after=move.fen_after,
                eval_before=analysis_before.score_cp,
                eval_after=analysis_after.score_cp,
                best_move_uci=analysis_before.best_move,
                eval_loss=eval_loss,
                classification=classification.value,
                accuracy=move_accuracy,
                explanation=explanation,
                tactical_events=[
                    TacticalEvent(**e.__dict__) if not isinstance(e, TacticalEvent) else e
                    for e in tactical_events
                ],
                positional_events=[
                    PositionalEvent(**e.__dict__) if not isinstance(e, PositionalEvent) else e
                    for e in positional_events
                ],
                endgame_events=[
                    EndgameEvent(**e.__dict__) if not isinstance(e, EndgameEvent) else e
                    for e in endgame_events
                ],
            ))

        # ── 5. Opening detection ──────────────────────────────────────────────
        opening_result: OpeningInfo | None = None
        detected = detect_opening(san_sequence)
        if detected:
            opening_result = OpeningInfo(
                name=detected.name,
                eco=detected.eco,
                variation=detected.variation,
            )

        # ── 6. Per-player accuracy summary ────────────────────────────────────
        white_moves = [m for m in move_analyses if m.color == "white" and m.accuracy is not None]
        black_moves = [m for m in move_analyses if m.color == "black" and m.accuracy is not None]

        accuracy_white = compute_game_accuracy([m.accuracy for m in white_moves if m.accuracy is not None])
        accuracy_black = compute_game_accuracy([m.accuracy for m in black_moves if m.accuracy is not None])

        def _count(moves_list: list[MoveAnalysis], cls: str) -> int:
            return sum(1 for m in moves_list if m.classification == cls)

        white_summary = PlayerReviewSummary(
            color="white",
            accuracy=round(accuracy_white, 2) if white_moves else None,
            blunders=_count(white_moves, MoveClassification.BLUNDER.value),
            mistakes=_count(white_moves, MoveClassification.MISTAKE.value),
            inaccuracies=_count(white_moves, MoveClassification.INACCURACY.value),
        )
        black_summary = PlayerReviewSummary(
            color="black",
            accuracy=round(accuracy_black, 2) if black_moves else None,
            blunders=_count(black_moves, MoveClassification.BLUNDER.value),
            mistakes=_count(black_moves, MoveClassification.MISTAKE.value),
            inaccuracies=_count(black_moves, MoveClassification.INACCURACY.value),
        )

        return ReviewResult(
            game_id=game_id,
            opening=opening_result,
            analysis_depth=analysis_depth,
            white=white_summary,
            black=black_summary,
            moves=move_analyses,
        )

    # ── Private helpers ───────────────────────────────────────────────────────

    def _run_stockfish(
        self,
        uci_sequence: list[str],
        initial_fen: str,
        depth: int,
    ) -> list:
        """
        Run Stockfish and return a list of PositionAnalysis objects.
        Falls back to zero-scores if Stockfish is unavailable.
        """
        from app.analysis.stockfish_engine import PositionAnalysis

        try:
            with StockfishEngine(path=settings.STOCKFISH_PATH, depth=depth) as engine:
                return engine.analyse_game(uci_sequence, initial_fen, depth)
        except Exception as exc:  # noqa: BLE001
            logger.error("Stockfish unavailable: %s — returning zero evaluations", exc)
            # Return neutral evaluations so the rest of the pipeline still works
            dummy = PositionAnalysis(score_cp=0.0, best_move=None)
            return [dummy] * (len(uci_sequence) + 1)

    def _build_explanation(
        self,
        classification: MoveClassification,
        eval_loss: float,
        best_move_uci: str | None,
        tactical_events: list,
        positional_events: list,
    ) -> str:
        """
        Choose and fill the most appropriate explanation template.
        Prioritise tactical events, then positional, then generic classification.
        """
        # Optimal move takes priority
        if classification == MoveClassification.BEST:
            return "Best move!"

        # Tactical events take priority
        if tactical_events:
            ev = tactical_events[0]
            return fill_template(ev.pattern, **ev.extra, piece=ev.piece, square=ev.square)

        # Then positional
        if positional_events:
            ev = positional_events[0]
            return fill_template(ev.pattern, **ev.extra)

        # Generic classification explanation
        if classification == MoveClassification.BLUNDER:
            return fill_template("BLUNDER")
        if classification == MoveClassification.MISTAKE:
            return fill_template("MISTAKE")
        if classification == MoveClassification.INACCURACY:
            return fill_template("INACCURACY", best_move=best_move_uci or "the engine's suggestion")
        # GOOD
        return fill_template(
            "GENERIC_BETTER_MOVE",
            best_move=best_move_uci or "engine suggestion",
            eval_diff=-eval_loss / 100,
        )
