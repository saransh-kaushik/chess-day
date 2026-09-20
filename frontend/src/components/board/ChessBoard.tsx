import { Chessboard } from 'react-chessboard';

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

export const ChessBoard = ({
  fen,
  orientation,
  onMove,
  legalMoves: _legalMoves,
  lastMove: _lastMove,
  isCheck: _isCheck,
  showCoordinates = true,
  interactive = true,
}: ChessBoardProps) => {
  function onDrop(sourceSquare: string, targetSquare: string, piece: string) {
    if (!interactive) return false;
    return onMove(sourceSquare, targetSquare, piece);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={onDrop}
        arePiecesDraggable={interactive}
        showBoardNotation={showCoordinates}
      />
    </div>
  );
};

export default ChessBoard;
