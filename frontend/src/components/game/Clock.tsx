interface ClockProps {
  timeRemaining: number;
  isActive: boolean;
  color?: 'white' | 'black';
}

export const Clock = ({ timeRemaining, isActive, color }: ClockProps) => {
  const m = Math.floor(timeRemaining / 60);
  const s = Math.floor(timeRemaining % 60);
  const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
  const isLowTime = timeRemaining < 30 && timeRemaining > 0;

  return (
    <div
      className={`min-w-32 rounded-xl border px-4 py-2 text-2xl font-mono font-bold shadow-lg flex items-center gap-2 ${
        isActive ? 'border-amber-300/50 bg-amber-400 text-slate-950 shadow-amber-500/15' : 'border-white/10 bg-slate-800 text-slate-100'
      } ${isLowTime ? 'border-rose-400 bg-rose-500 text-white animate-pulse' : ''}`}
    >
      {color && <span className="text-xs text-gray-300 capitalize">{color}:</span>}
      <span>{timeStr}</span>
    </div>
  );
};
