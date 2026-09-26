import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface GameControlsProps {
  onResign: () => void;
  onOfferDraw: () => void;
  onNewGame?: () => void;
  onFlip?: () => void;
  onUndo?: () => void;
  gameOver: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onResign,
  onOfferDraw,
  onNewGame,
  onFlip,
  onUndo,
  gameOver,
}) => {
  const [confirmAction, setConfirmAction] = useState<'resign' | 'draw' | null>(null);

  const handleConfirm = () => {
    if (confirmAction === 'resign') onResign();
    else if (confirmAction === 'draw') onOfferDraw();
    setConfirmAction(null);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <Button variant="danger" onClick={() => setConfirmAction('resign')} disabled={gameOver}>
        Resign
      </Button>
      <Button variant="secondary" onClick={() => setConfirmAction('draw')} disabled={gameOver}>
        Offer Draw
      </Button>
      {onNewGame && (
        <Button variant="secondary" onClick={onNewGame}>
          New Game
        </Button>
      )}
      {onUndo && (
        <Button variant="secondary" onClick={onUndo} disabled={gameOver}>
          Undo
        </Button>
      )}
      {onFlip && (
        <Button variant="secondary" onClick={onFlip}>
          Flip Board
        </Button>
      )}

      <Modal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'resign' ? 'Resign Game?' : 'Offer Draw?'}
      >
        <p className="text-gray-300 mb-4">
          {confirmAction === 'resign'
            ? 'Are you sure you want to resign? This will end the game as a loss.'
            : 'Are you sure you want to offer a draw?'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
};
