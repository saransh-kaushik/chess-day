import { useState, useEffect, useRef } from 'react';

export interface PositionEval {
  fen: string;
  score: number;
  bestMove: string;
  pv: string[];
  depth: number;
}

export interface UseStockfishReturn {
  isReady: boolean;
  getBestMove: (fen: string, depth: number, skillLevel?: number) => Promise<string>;
  analyzePosition: (fen: string, depth: number) => Promise<PositionEval>;
  analyzeGame: (fens: string[], depth: number, onProgress?: (progress: number) => void) => Promise<PositionEval[]>;
  stopSearch: () => void;
}

export const useStockfish = (): UseStockfishReturn => {
  const [isReady, setIsReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/stockfish.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'ready') setIsReady(true);
    };
    workerRef.current.postMessage({ type: 'init' });

    return () => {
      workerRef.current?.postMessage({ type: 'quit' });
      workerRef.current?.terminate();
    };
  }, []);

  const getBestMove = (fen: string, depth: number, skillLevel?: number): Promise<string> => {
    return new Promise((resolve) => {
      if (!workerRef.current) return resolve('');
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'bestMove') {
          workerRef.current?.removeEventListener('message', handler);
          resolve(e.data.move);
        }
      };
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'getBestMove', fen, depth, skillLevel });
    });
  };

  const analyzePosition = (fen: string, depth: number): Promise<PositionEval> => {
    return new Promise((resolve) => {
      if (!workerRef.current) return resolve({ fen, score: 0, bestMove: '', pv: [], depth: 0 });
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'evaluation') {
          workerRef.current?.removeEventListener('message', handler);
          resolve(e.data);
        }
      };
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'analyzePosition', fen, depth });
    });
  };

  const analyzeGame = (fens: string[], depth: number, onProgress?: (progress: number) => void): Promise<PositionEval[]> => {
    return new Promise((resolve) => {
      if (!workerRef.current) return resolve([]);
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'gameAnalysis') {
          workerRef.current?.removeEventListener('message', handler);
          resolve(e.data.results);
        }
      };
      workerRef.current.addEventListener('message', handler);
      // Mock progress
      if (onProgress) {
        let p = 0;
        const int = setInterval(() => {
          p += 10;
          if (p <= 100) onProgress(p);
          if (p >= 100) clearInterval(int);
        }, 100);
      }
      workerRef.current.postMessage({ type: 'analyzeGame', fens, depth });
    });
  };

  const stopSearch = () => {
    workerRef.current?.postMessage({ type: 'stop' });
  };

  return { isReady, getBestMove, analyzePosition, analyzeGame, stopSearch };
};
