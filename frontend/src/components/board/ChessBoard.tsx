import { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ChessBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  onMove: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
  legalMoves?: string[];
  lastMove?: { from: string; to: string } | null;
  isCheck?: boolean;
  showCoordinates?: boolean;
  interactive?: boolean;
  promotionPiece?: string;
}

/**
 * Chess board with:
 * - Click-to-select piece: shows legal move dots on destination squares
 * - Drag-to-move support
 * - Last move highlight
 */
export const ChessBoard = ({
  fen,
  orientation,
  onMove,
  lastMove,
  showCoordinates = true,
  interactive = true,
}: ChessBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalSquares, setLegalSquares] = useState<string[]>([]);

  // Compute legal moves from current FEN for the selected piece
  const getLegalTargets = useCallback(
    (square: string): string[] => {
      try {
        const chess = new Chess(fen);
        return chess
          .moves({ square: square as Parameters<typeof chess.moves>[0]['square'], verbose: true })
          .map((m) => m.to);
      } catch {
        return [];
      }
    },
    [fen],
  );

  const handleSquareClick = useCallback(
    (square: string) => {
      if (!interactive) return;

      // If a piece is already selected and this is a legal target → make the move
      if (selectedSquare && legalSquares.includes(square)) {
        const ok = onMove(selectedSquare, square, '');
        if (ok) {
          setSelectedSquare(null);
          setLegalSquares([]);
          return;
        }
      }

      // Try selecting this square's piece
      const targets = getLegalTargets(square);
      if (targets.length > 0) {
        setSelectedSquare(square);
        setLegalSquares(targets);
      } else {
        // Clicking empty / opponent piece with nothing selected → deselect
        setSelectedSquare(null);
        setLegalSquares([]);
      }
    },
    [interactive, selectedSquare, legalSquares, onMove, getLegalTargets],
  );

  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string) => {
      if (!interactive) return false;
      const ok = onMove(sourceSquare, targetSquare, piece);
      if (ok) {
        setSelectedSquare(null);
        setLegalSquares([]);
      }
      return ok;
    },
    [interactive, onMove],
  );

  // Build square styles
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  // Last move highlight (subtle amber tint)
  if (lastMove) {
    const highlight: React.CSSProperties = { backgroundColor: 'rgba(245, 158, 11, 0.35)' };
    customSquareStyles[lastMove.from] = highlight;
    customSquareStyles[lastMove.to] = highlight;
  }

  // Selected square highlight
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      ...customSquareStyles[selectedSquare],
      backgroundColor: 'rgba(245, 158, 11, 0.55)',
    };
  }

  // Legal move dots on target squares
  legalSquares.forEach((sq) => {
    const existing = customSquareStyles[sq];
    const isOccupied = isSquareOccupied(fen, sq);
    customSquareStyles[sq] = {
      ...existing,
      // Dot style via radial-gradient — ring for captures, dot for empty
      background: isOccupied
        ? `radial-gradient(circle, transparent 55%, rgba(0,0,0,0.45) 56%, rgba(0,0,0,0.45) 70%, transparent 71%), ${existing?.backgroundColor ?? 'transparent'}`
        : `radial-gradient(circle at center, rgba(0,0,0,0.38) 24%, transparent 25%), ${existing?.backgroundColor ?? 'transparent'}`,
    };
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={handlePieceDrop}
        onSquareClick={handleSquareClick}
        arePiecesDraggable={interactive}
        showBoardNotation={showCoordinates}
        customSquareStyles={customSquareStyles}
      />
    </div>
  );
};

/** Returns true if the given square has a piece in the given FEN */
function isSquareOccupied(fen: string, square: string): boolean {
  try {
    const chess = new Chess(fen);
    return chess.get(square as Parameters<typeof chess.get>[0]) !== null;
  } catch {
    return false;
  }
}

export default ChessBoard;
