"""
Initial database migration — creates all tables.

Revision: 0001
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("username", sa.String(64), nullable=False, unique=True),
        sa.Column("email", sa.String(254), nullable=True, unique=True),
        sa.Column("hashed_password", sa.String(256), nullable=True),
        sa.Column("is_guest", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_seen",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_email", "users", ["email"])

    # ── games ─────────────────────────────────────────────────────────────────
    op.create_table(
        "games",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("white_player_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("black_player_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("white_guest_name", sa.String(64), nullable=True),
        sa.Column("black_guest_name", sa.String(64), nullable=True),
        sa.Column("mode", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="waiting"),
        sa.Column("initial_fen", sa.Text(), nullable=False),
        sa.Column("current_fen", sa.Text(), nullable=False),
        sa.Column("pgn", sa.Text(), nullable=False, server_default=""),
        sa.Column("result", sa.String(8), nullable=True),
        sa.Column("time_control", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_games_white_player_id", "games", ["white_player_id"])
    op.create_index("ix_games_black_player_id", "games", ["black_player_id"])

    # ── moves ─────────────────────────────────────────────────────────────────
    op.create_table(
        "moves",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("game_id", sa.String(36), sa.ForeignKey("games.id", ondelete="CASCADE"), nullable=False),
        sa.Column("move_number", sa.Integer(), nullable=False),
        sa.Column("color", sa.String(8), nullable=False),
        sa.Column("uci", sa.String(8), nullable=False),
        sa.Column("san", sa.String(16), nullable=False),
        sa.Column("fen_before", sa.Text(), nullable=False),
        sa.Column("fen_after", sa.Text(), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("clock_remaining", sa.Float(), nullable=True),
    )
    op.create_index("ix_moves_game_id", "moves", ["game_id"])

    # ── reviews ───────────────────────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("game_id", sa.String(36), sa.ForeignKey("games.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("accuracy_white", sa.Float(), nullable=True),
        sa.Column("accuracy_black", sa.Float(), nullable=True),
        sa.Column("blunders_white", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mistakes_white", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("inaccuracies_white", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("blunders_black", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mistakes_black", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("inaccuracies_black", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("moves_analysis", sa.JSON(), nullable=True),
        sa.Column("opening_name", sa.String(128), nullable=True),
        sa.Column("opening_eco", sa.String(8), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("analysis_depth", sa.Integer(), nullable=False, server_default="20"),
    )
    op.create_index("ix_reviews_game_id", "reviews", ["game_id"])

    # ── player_stats ──────────────────────────────────────────────────────────
    op.create_table(
        "player_stats",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("games_played", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("losses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("draws", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_accuracy", sa.Float(), nullable=True),
        sa.Column("total_blunders", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_mistakes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_inaccuracies", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tactical_mistakes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("positional_mistakes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_player_stats_user_id", "player_stats", ["user_id"])


def downgrade() -> None:
    op.drop_table("player_stats")
    op.drop_table("reviews")
    op.drop_table("moves")
    op.drop_table("games")
    op.drop_table("users")
