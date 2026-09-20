import React from 'react';

export const EvaluationBar: React.FC<{ evaluation: number; mateIn?: number | null }> = ({ evaluation, mateIn }) => {
  const cap = 10;
  const normalized = Math.max(-cap, Math.min(cap, evaluation));
  const percent = ((normalized + cap) / (2 * cap)) * 100;
  
  return (
    <div className="h-full w-8 bg-gray-800 flex flex-col-reverse rounded overflow-hidden relative">
      <div className="bg-white w-full transition-all duration-300" style={{ height: `${percent}%` }}></div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-bold text-gray-500 z-10 mix-blend-difference">
        {mateIn ? `M${mateIn}` : (evaluation > 0 ? '+' : '') + evaluation.toFixed(1)}
      </div>
    </div>
  );
};
