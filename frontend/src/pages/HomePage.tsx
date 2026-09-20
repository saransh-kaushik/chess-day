import { useNavigate } from 'react-router-dom';

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4">
      <h1 className="text-4xl font-bold mb-8">Welcome to Chess Day</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="bg-gray-800 p-6 rounded-lg text-center hover:bg-gray-700 cursor-pointer transition-colors" onClick={() => navigate('/local')}>
          <h2 className="text-2xl font-bold text-blue-400 mb-2">Local Game</h2>
          <p className="text-gray-400 mb-4">Play locally with a friend on the same device.</p>
          <button className="bg-blue-600 px-4 py-2 rounded text-white font-bold w-full">Play</button>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg text-center hover:bg-gray-700 cursor-pointer transition-colors" onClick={() => navigate('/bot')}>
          <h2 className="text-2xl font-bold text-green-400 mb-2">Play Bot</h2>
          <p className="text-gray-400 mb-4">Play against Stockfish right in your browser.</p>
          <button className="bg-green-600 px-4 py-2 rounded text-white font-bold w-full">Play</button>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg text-center hover:bg-gray-700 cursor-pointer transition-colors" onClick={() => navigate('/online')}>
          <h2 className="text-2xl font-bold text-purple-400 mb-2">Play Online</h2>
          <p className="text-gray-400 mb-4">Match with players online and climb the ladder.</p>
          <button className="bg-purple-600 px-4 py-2 rounded text-white font-bold w-full">Play</button>
        </div>
      </div>
    </div>
  );
};
