import React from 'react';
import { Button } from '../ui/Button';

interface GameControlsProps {
  onResign: () => void;
  onOfferDraw: () => void;
  onNewGame?: () => void;
  gameOver: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onResign,
  onOfferDraw,
  onNewGame,
  gameOver,
}) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <Button variant="danger" onClick={onResign} disabled={gameOver}>
        Resign
      </Button>
      <Button variant="secondary" onClick={onOfferDraw} disabled={gameOver}>
        Offer Draw
      </Button>
      {onNewGame && (
        <Button variant="secondary" onClick={onNewGame}>
          New Game
        </Button>
      )}
    </div>
  );
};
