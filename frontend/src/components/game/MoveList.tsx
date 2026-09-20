import React from 'react';
import { ChessMove } from '../../types/chess';

interface MoveListProps {
  moves: ChessMove[];
  currentIndex: number;
  onMoveClick: (index: number) => void;
}

export const MoveList: React.FC<MoveListProps> = ({ moves, currentIndex, onMoveClick }) => {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
      whiteIdx: i + 1,
      blackIdx: i + 2,
    });
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg h-64 overflow-y-auto">
      <h3 className="font-bold mb-2 text-white text-sm">Moves</h3>
      <div className="grid grid-cols-3 gap-1 text-sm">
        {rows.map((row) => (
          <React.Fragment key={row.num}>
            <div className="text-gray-400 text-right pr-2">{row.num}.</div>
            <button
              onClick={() => onMoveClick(row.whiteIdx)}
              className={`font-mono text-left px-1 rounded transition-colors ${
                currentIndex === row.whiteIdx
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-200 hover:bg-gray-700'
              }`}
            >
              {row.white?.san ?? ''}
            </button>
            <button
              onClick={() => row.black && onMoveClick(row.blackIdx)}
              className={`font-mono text-left px-1 rounded transition-colors ${
                currentIndex === row.blackIdx
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-200 hover:bg-gray-700'
              }`}
            >
              {row.black?.san ?? ''}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
