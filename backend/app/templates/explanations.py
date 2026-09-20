"""
Predefined explanation templates for all move classification and event types.

No LLM, no external calls — fully deterministic text generation.
"""

from __future__ import annotations

# ── Template Definitions ─────────────────────────────────────────────────────
TEMPLATES: dict[str, str] = {
    # ── Tactical patterns ────────────────────────────────────────────────────
    "HANGING_PIECE": (
        "You left your {piece} on {square} undefended, allowing your opponent to win material."
    ),
    "MISSED_CAPTURE": (
        "You missed the opportunity to capture the opponent's {piece} on {square} for free."
    ),
    "FORK": (
        "You missed a {piece} fork attacking the {target1} on {square1} "
        "and {target2} on {square2}."
    ),
    "PIN": (
        "Your {piece} on {square} is pinned to your {pinned_to} and cannot move safely."
    ),
    "SKEWER": (
        "Your {piece} on {square} is skewered — after it moves, "
        "the {behind_piece} will be captured."
    ),
    "DISCOVERED_ATTACK": (
        "Moving this piece reveals a hidden attack from your {piece} on {square}."
    ),
    "BACK_RANK_THREAT": (
        "Your back rank is vulnerable to a checkmate threat. "
        "Consider creating a luft for your king."
    ),
    "MATE_THREAT": (
        "This creates a checkmate threat that your opponent can exploit."
    ),
    "MISSED_CHECK": (
        "You could have given check with {piece} to {square}, gaining tempo."
    ),

    # ── Positional patterns ──────────────────────────────────────────────────
    "POOR_DEVELOPMENT": (
        "This move spends another tempo on a piece that has already moved "
        "while other pieces remain undeveloped."
    ),
    "REPEATED_PIECE_MOVEMENT": (
        "This is the {count}th time this piece has moved in the opening. "
        "Consider developing other pieces instead."
    ),
    "KING_SAFETY": (
        "Your king is exposed with open lines nearby. "
        "Consider castling or improving king protection."
    ),
    "WEAK_PAWN_STRUCTURE": (
        "This creates a {pawn_type} pawn, a long-term structural weakness "
        "that your opponent can target."
    ),
    "POOR_EXCHANGE": (
        "You traded your {lost_piece} for the opponent's {gained_piece} "
        "without sufficient compensation."
    ),
    "UNNECESSARY_PAWN_MOVE": (
        "This pawn move in the opening weakens your position. "
        "Prefer developing pieces or controlling the centre."
    ),

    # ── Endgame patterns ─────────────────────────────────────────────────────
    "PASSED_PAWN": (
        "You have a passed pawn on {square} that should be advanced — "
        "passed pawns are a decisive advantage in endgames."
    ),
    "KING_ACTIVITY": (
        "Good king activation towards the centre — "
        "an active king is a powerful weapon in the endgame."
    ),
    "PROMOTION_RACE": (
        "Both sides are racing to promote — "
        "accurate calculation is critical here."
    ),
    "ROOK_ACTIVITY": (
        "Your rook is well-placed on an active square. "
        "Rook activity is essential in endgames."
    ),

    # ── Generic classification explanations ──────────────────────────────────
    "BLUNDER": (
        "This was a serious mistake that significantly worsened your position. "
        "Your opponent now has a decisive advantage."
    ),
    "MISTAKE": (
        "This move gave away a significant advantage. "
        "The engine suggests a stronger continuation was available."
    ),
    "INACCURACY": (
        "A slightly inaccurate move — {best_move} would have been better "
        "and maintained more of your advantage."
    ),
    "GENERIC_BETTER_MOVE": (
        "The engine suggests {best_move} was stronger here (eval: {eval_diff:+.1f})."
    ),
}


_SAFE_DEFAULTS: dict[str, str] = {
    "piece": "piece",
    "square": "its square",
    "target1": "target",
    "target2": "target",
    "square1": "",
    "square2": "",
    "pinned_to": "valuable piece",
    "behind_piece": "piece behind it",
    "pawn_type": "weak",
    "lost_piece": "piece",
    "gained_piece": "piece",
    "count": "another",
    "best_move": "a better move",
    "eval_diff": "0.0",
}


class _SafeDict(dict):
    def __missing__(self, key: str) -> str:
        return _SAFE_DEFAULTS.get(key, f"the {key}")


def fill_template(key: str, **kwargs: object) -> str:
    """
    Fill a named template with the given keyword arguments.

    Falls back to GENERIC_BETTER_MOVE if the key is not found.
    Missing variables are safely replaced with readable chess terms.
    """
    template = TEMPLATES.get(key, TEMPLATES["GENERIC_BETTER_MOVE"])
    try:
        mapping = _SafeDict({k: v for k, v in kwargs.items() if v is not None})
        return template.format_map(mapping)
    except Exception:
        return template
