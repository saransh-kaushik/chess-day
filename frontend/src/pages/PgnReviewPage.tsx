import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePgnLoader } from '../hooks/usePgnLoader';

const SAMPLE_PGN = `[Event "yuannonly vs. saransh_kaushik"]
[Site "Chess.com"]
[Date "2026-09-21"]
[White "yuannonly"]
[Black "saransh_kaushik"]
[Result "1-0"]
[WhiteElo "379"]
[BlackElo "347"]
[TimeControl "60"]
[Termination "yuannonly won by checkmate"]

1. d4 e5 2. dxe5 Nc6 3. Nf3 f6 4. exf6 Qxf6 5. e4 Nh6 6. Bb5 Ng4 7. O-O a6 8. h3
Nge5 9. Bxc6 bxc6 10. Re1 Bb7 11. Nc3 c5 12. b3 Bxe4 13. Bg5 Qg6 14. Nxe5 Qxg5
15. Qxd7# 1-0`;

export const PgnReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { loadPgn } = usePgnLoader();

  const [pgn, setPgn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{
    whiteName: string;
    blackName: string;
    moveCount: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const tryParse = useCallback(
    (text: string) => {
      setError(null);
      setParsed(null);
      if (!text.trim()) return;
      try {
        const result = loadPgn(text);
        setParsed(result);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Invalid PGN — please check the format and try again.',
        );
      }
    },
    [loadPgn],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPgn(val);
    tryParse(val);
  };

  const handleUseSample = () => {
    setPgn(SAMPLE_PGN);
    tryParse(SAMPLE_PGN);
  };

  const handlePaste = () => {
    navigator.clipboard.readText().then((text) => {
      setPgn(text);
      tryParse(text);
    });
  };

  const handleClear = () => {
    setPgn('');
    setError(null);
    setParsed(null);
    textareaRef.current?.focus();
  };

  const handleAnalyze = () => {
    if (!parsed) return;
    // loadPgn already hydrated the store, just navigate
    navigate('/review');
  };

  // Drag-and-drop file support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPgn(text);
      tryParse(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← Home
        </button>
        <div className="w-px h-4 bg-gray-700" />
        <h1 className="text-white font-semibold text-sm">PGN Review</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-6">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">♛</div>
            <h2 className="text-2xl font-bold text-white mb-2">Analyze a PGN Game</h2>
            <p className="text-gray-400 text-sm">
              Paste your PGN from Chess.com, Lichess, or any other source and get a full Stockfish review.
            </p>
          </div>

          {/* Drop zone + textarea */}
          <div
            className={`relative rounded-xl border-2 transition-all duration-200 ${
              isDragging
                ? 'border-amber-500 bg-amber-500/5'
                : error
                ? 'border-red-500/60 bg-gray-900'
                : parsed
                ? 'border-green-500/60 bg-gray-900'
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-amber-500/10 z-10 pointer-events-none">
                <span className="text-amber-400 font-semibold text-lg">Drop .pgn file here</span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={pgn}
              onChange={handleChange}
              placeholder={`Paste PGN here…\n\nExample:\n[Event "My Game"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 ...`}
              className="w-full bg-transparent text-gray-200 text-sm font-mono resize-none rounded-xl p-4 outline-none placeholder-gray-600 min-h-[240px]"
              spellCheck={false}
              autoFocus
            />
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handlePaste}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
            >
              📋 Paste
            </button>
            <button
              onClick={handleUseSample}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
            >
              🎲 Load Sample
            </button>
            {pgn && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded-lg transition-colors ml-auto"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <span className="text-red-400 text-sm mt-0.5 flex-shrink-0">⚠</span>
              <p className="text-red-300 text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {/* Success preview card */}
          {parsed && !error && (
            <div className="mt-4 bg-gray-900 border border-green-500/30 rounded-xl px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-sm font-semibold">PGN loaded successfully</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-white font-bold truncate">{parsed.whiteName}</div>
                  <div className="text-gray-500 text-xs mt-0.5">White</div>
                </div>
                <div>
                  <div className="text-amber-400 font-bold text-lg">vs</div>
                  <div className="text-gray-500 text-xs">{parsed.moveCount} moves</div>
                </div>
                <div>
                  <div className="text-white font-bold truncate">{parsed.blackName}</div>
                  <div className="text-gray-500 text-xs mt-0.5">Black</div>
                </div>
              </div>
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={!parsed || !!error}
            className="mt-6 w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 text-black font-bold text-base rounded-xl transition-colors shadow-lg shadow-amber-500/10"
          >
            {parsed ? `⚡ Analyze ${parsed.moveCount} Moves` : 'Paste a PGN to start'}
          </button>

          {/* Tip */}
          <p className="text-center text-gray-600 text-xs mt-4">
            You can also drag & drop a <code className="text-gray-500">.pgn</code> file onto the text box above
          </p>
        </div>
      </div>
    </div>
  );
};
