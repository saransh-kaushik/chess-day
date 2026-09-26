import { useEffect, useRef } from 'react';
import { useChessGame } from '../hooks/useChessGame';
import ChessBoardWrapper from '../components/board/ChessBoard';
import { GameInfo } from '../components/game/GameInfo';
import { MoveList } from '../components/game/MoveList';
import { GameControls } from '../components/game/GameControls';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useGameReview } from '../hooks/useGameReview';
import { useChessSound } from '../hooks/useChessSound';

export const LocalGamePage = () => {
  const { gameState, makeMove, resetGame, resign, offerDraw, isGameOver, legalMoves } = useChessGame();
  const navigate = useNavigate();
  const { isAnalyzing } = useGameReview();
  const { playSound } = useChessSound();
  const prevMoveCountRef = useRef(gameState.moves.length);

  // Play sound when a new move is made
  useEffect(() => {
    const moves = gameState.moves;
    if (moves.length === prevMoveCountRef.current) return;
    prevMoveCountRef.current = moves.length;
    const lastMove = moves[moves.length - 1];
    if (!lastMove) return;
    const san = lastMove.san ?? '';
    if (san.includes('#') || san.includes('+')) {
      playSound('check');
    } else if (san.includes('x')) {
      playSound('capture');
    } else {
      playSound('move');
    }
  }, [gameState.moves, playSound]);

  useEffect(() => {
    if (gameState.status === 'idle') {
      resetGame('local');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReview = () => {
    navigate('/review');
  };

  const lastMove =
    gameState.moves.length > 0
      ? {
          from: gameState.moves[gameState.moves.length - 1].uci.slice(0, 2),
          to: gameState.moves[gameState.moves.length - 1].uci.slice(2, 4),
        }
      : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto h-full">
      <div className="flex-grow flex items-center justify-center">
        <ChessBoardWrapper
          fen={gameState.currentFen}
          orientation={gameState.isWhiteTurn ? 'white' : 'black'}
          onMove={(source, target, piece) => {
            const promotion =
              piece.length > 1 && piece[1] !== 'P' ? piece[1].toLowerCase() : undefined;
            return makeMove(source + target + (promotion || ''));
          }}
          legalMoves={legalMoves}
          lastMove={lastMove}
          interactive={!isGameOver}
        />
      </div>
      <div className="w-full lg:w-96 flex flex-col">
        <GameInfo />
        <MoveList moves={gameState.moves} currentIndex={gameState.moves.length} onMoveClick={() => {}} />
        <div className="mt-4 flex flex-col gap-2">
          {!isGameOver ? (
            <GameControls
              onResign={() => resign(gameState.isWhiteTurn ? 'white' : 'black')}
              onOfferDraw={offerDraw}
              gameOver={isGameOver}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <Button onClick={() => resetGame('local')}>Rematch</Button>
              <Button variant="secondary" onClick={handleReview} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analyzing...' : 'Game Review'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
