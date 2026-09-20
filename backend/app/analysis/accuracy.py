"""
Move Accuracy Metric — nonlinear centipawn-loss to accuracy mapping.

Formula inspired by Lichess's accuracy formula:
    accuracy = 103.1668 * exp(-0.04354 * loss) - 3.1668

Clipped to [0, 100].
"""

from __future__ import annotations

import math


def eval_loss_to_accuracy(eval_loss_centipawns: float) -> float:
    """
    Map centipawn loss to move accuracy on a [0, 100] scale.

    Uses an exponential decay mapping so small losses barely penalise
    while large losses result in near-zero accuracy.

    Args:
        eval_loss_centipawns: How many centipawns the mover's position
            deteriorated due to their move (non-negative; negative means
            the move improved the position — treat as 0).

    Returns:
        Accuracy score in [0.0, 100.0].
    """
    loss = max(0.0, eval_loss_centipawns)
    # Exponential decay formula
    raw = 103.1668 * math.exp(-0.04354 * loss) - 3.1668
    return max(0.0, min(100.0, raw))


def compute_game_accuracy(move_accuracies: list[float]) -> float:
    """
    Compute overall game accuracy as the average of per-move accuracies.

    Forced moves (those with only one legal option) should be excluded
    before calling this function; the caller is responsible for filtering.

    Args:
        move_accuracies: List of per-move accuracy values in [0, 100].

    Returns:
        Average accuracy in [0, 100], or 0.0 if the list is empty.
    """
    if not move_accuracies:
        return 0.0
    return sum(move_accuracies) / len(move_accuracies)
