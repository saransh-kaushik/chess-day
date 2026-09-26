import { useState, useEffect, useRef, useCallback } from 'react';

interface UseClockOptions {
  /** Initial seconds for white */
  whiteInitial: number;
  /** Initial seconds for black */
  blackInitial: number;
  /** Which side is currently on the clock */
  activeColor: 'white' | 'black' | null;
  /** Whether the game is over (stops the clock) */
  gameOver: boolean;
  /** Increment in seconds added after each move */
  increment?: number;
  /** Called when a player's time hits 0 */
  onTimeout?: (color: 'white' | 'black') => void;
}

interface UseClockReturn {
  whiteTime: number;
  blackTime: number;
  /** Call this after a move to apply the increment to the player who just moved */
  applyIncrement: (color: 'white' | 'black') => void;
  /** Reset both clocks (e.g. on new game) */
  resetClocks: (whiteInitial: number, blackInitial: number) => void;
}

/**
 * Self-contained clock hook. Ticks down the active player's time every second.
 * Handles increment, timeout callback, and pause on game over.
 */
export const useClock = ({
  whiteInitial,
  blackInitial,
  activeColor,
  gameOver,
  increment = 0,
  onTimeout,
}: UseClockOptions): UseClockReturn => {
  const [whiteTime, setWhiteTime] = useState(whiteInitial);
  const [blackTime, setBlackTime] = useState(blackInitial);

  // Keep a ref to onTimeout so interval doesn't go stale
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Reset when initial values change (new game started)
  useEffect(() => {
    setWhiteTime(whiteInitial);
    setBlackTime(blackInitial);
  }, [whiteInitial, blackInitial]);

  // The ticking interval
  useEffect(() => {
    if (gameOver || activeColor === null) return;

    const id = setInterval(() => {
      if (activeColor === 'white') {
        setWhiteTime((t) => {
          const next = Math.max(0, t - 1);
          if (next === 0) onTimeoutRef.current?.('white');
          return next;
        });
      } else {
        setBlackTime((t) => {
          const next = Math.max(0, t - 1);
          if (next === 0) onTimeoutRef.current?.('black');
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(id);
  }, [activeColor, gameOver]);

  const applyIncrement = useCallback((color: 'white' | 'black') => {
    if (increment <= 0) return;
    if (color === 'white') setWhiteTime((t) => t + increment);
    else setBlackTime((t) => t + increment);
  }, [increment]);

  const resetClocks = useCallback((w: number, b: number) => {
    setWhiteTime(w);
    setBlackTime(b);
  }, []);

  return { whiteTime, blackTime, applyIncrement, resetClocks };
};
