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
      className={`text-2xl font-mono px-4 py-2 rounded flex items-center gap-2 ${
        isActive ? 'bg-blue-800' : 'bg-gray-700'
      } ${isLowTime ? 'bg-red-800 text-white animate-pulse' : ''}`}
    >
      {color && <span className="text-xs text-gray-300 capitalize">{color}:</span>}
      <span>{timeStr}</span>
    </div>
  );
};
