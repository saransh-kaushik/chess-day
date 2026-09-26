import { useGameStore } from '../../store/gameStore';

export const GameInfo = () => {
  const { gameState } = useGameStore();

  return (
    <div className="app-panel mb-4 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">{gameState.black.name} (Black)</h3>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-1 text-sm font-bold text-amber-300">
          vs
        </div>
        <div className="text-right">
          <h3 className="font-bold text-lg">{gameState.white.name} (White)</h3>
        </div>
      </div>
      <div className="mt-4 text-center">
        Status: <span className="font-semibold capitalize text-amber-300">{gameState.status}</span>
        {gameState.result && <span className="ml-4 font-bold text-green-400">Result: {gameState.result}</span>}
      </div>
    </div>
  );
};
