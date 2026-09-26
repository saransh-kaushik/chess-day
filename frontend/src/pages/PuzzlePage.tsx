import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChessBoard } from '../components/board/ChessBoard';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { getRandomPuzzle, submitAttempt } from '../api/puzzles';
import { Puzzle } from '../types/chess';
import { useChessSound } from '../hooks/useChessSound';

type AttemptStatus = 'pending' | 'correct' | 'incorrect';

export const PuzzlePage: React.FC = () => {
  const navigate = useNavigate();
  const { playSound } = useChessSound();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [fen, setFen] = useState<string>('');
  const [status, setStatus] = useState<AttemptStatus>('pending');
  const [solution, setSolution] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPuzzle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSolution(null);
    setStatus('pending');
    try {
      const p = await getRandomPuzzle();
      setPuzzle(p);
      setFen(p.fen);
    } catch (e: any) {
      setError('Could not load a puzzle. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPuzzle();
  }, [loadPuzzle]);

  const handleMove = (from: string, to: string, piece: string): boolean => {
    if (!puzzle || status !== 'pending') return false;

    const chess = new Chess(fen);
    let move;
    try {
      move = chess.move({ from, to, promotion: piece || undefined });
    } catch {
      move = null;
    }
    if (!move) return false;

    const uci = from + to + (piece || '');
    setFen(chess.fen());

    submitAttempt(puzzle.id, uci)
      .then((result) => {
        setSolution(result.solution);
        if (result.correct) {
          setStatus('correct');
          playSound('best');
        } else {
          setStatus('incorrect');
          playSound('blunder');
        }
      })
      .catch(() => {
        setError('Could not verify your move. Make sure the backend is running.');
      });

    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!puzzle) return null;

  const orientation: 'white' | 'black' = fen.includes(' b ') ? 'black' : 'white';

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Puzzles</h1>
            <p className="text-gray-400 text-sm">
              Find the best move for {orientation === 'white' ? 'White' : 'Black'}
              {puzzle.rating != null && (
                <span className="text-gray-500"> · rated {puzzle.rating}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Home
          </button>
        </div>

        <ChessBoard
          fen={fen}
          orientation={orientation}
          onMove={handleMove}
          interactive={status === 'pending'}
        />

        {status !== 'pending' && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center space-y-2">
            <p
              className={`font-bold ${
                status === 'correct' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {status === 'correct' ? 'Correct!' : 'Not quite.'}
            </p>
            {solution && (
              <p className="text-gray-400 text-sm">Solution: {solution.join(', ')}</p>
            )}
            <button
              onClick={loadPuzzle}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg"
            >
              Next Puzzle
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
