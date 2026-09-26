"""
Puzzles API — tactical puzzle endpoints.

Endpoints:
  GET  /puzzles/random              — a random puzzle (public)
  GET  /puzzles/{puzzle_id}         — a specific puzzle (public)
  POST /puzzles/{puzzle_id}/attempt — submit a solution attempt (public)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.puzzle import Puzzle
from app.schemas.puzzle import PuzzleAttemptRequest, PuzzleAttemptResult, PuzzleOut

router = APIRouter(prefix="/puzzles", tags=["puzzles"])


def _get_puzzle_or_404(puzzle_id: str, db: Session) -> Puzzle:
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found")
    return puzzle


# NOTE: /random must be registered before /{puzzle_id} or it will be
# swallowed as a path parameter.
@router.get("/random", response_model=PuzzleOut)
def get_random_puzzle(db: Session = Depends(get_db)) -> PuzzleOut:
    """Return a random puzzle."""
    puzzle = db.query(Puzzle).order_by(func.random()).first()
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No puzzles available")
    return PuzzleOut.model_validate(puzzle)


@router.get("/{puzzle_id}", response_model=PuzzleOut)
def get_puzzle(puzzle_id: str, db: Session = Depends(get_db)) -> PuzzleOut:
    """Return a specific puzzle by ID."""
    puzzle = _get_puzzle_or_404(puzzle_id, db)
    return PuzzleOut.model_validate(puzzle)


@router.post("/{puzzle_id}/attempt", response_model=PuzzleAttemptResult)
def attempt_puzzle(
    puzzle_id: str,
    body: PuzzleAttemptRequest,
    db: Session = Depends(get_db),
) -> PuzzleAttemptResult:
    """
    Submit a solution attempt for a puzzle.

    Compares the submitted UCI (trimmed, case-insensitive) against the first
    move of the known solution. Always returns the full solution so the
    frontend can display the correct answer regardless of outcome.
    """
    puzzle = _get_puzzle_or_404(puzzle_id, db)
    solution: list[str] = puzzle.solution_uci or []
    expected = solution[0].strip().lower() if solution else ""
    submitted = body.uci.strip().lower()
    correct = bool(expected) and submitted == expected
    return PuzzleAttemptResult(correct=correct, solution=solution)
