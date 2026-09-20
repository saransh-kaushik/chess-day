import { useGameStore } from '../../store/gameStore';

export const GameInfo = () => {
  const { gameState } = useGameStore();

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">{gameState.black.name} (Black)</h3>
        </div>
        <div className="text-xl font-mono bg-gray-900 px-3 py-1 rounded">
          vs
        </div>
        <div className="text-right">
          <h3 className="font-bold text-lg">{gameState.white.name} (White)</h3>
        </div>
      </div>
      <div className="mt-4 text-center">
        Status: <span className="font-semibold text-blue-400">{gameState.status}</span>
        {gameState.result && <span className="ml-4 font-bold text-green-400">Result: {gameState.result}</span>}
      </div>
    </div>
  );
};
