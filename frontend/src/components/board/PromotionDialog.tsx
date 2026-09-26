import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface PromotionDialogProps {
  isOpen: boolean;
  color: 'w' | 'b';
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

const PROMOTION_OPTIONS: { piece: 'q' | 'r' | 'b' | 'n'; label: string }[] = [
  { piece: 'q', label: 'Queen' },
  { piece: 'r', label: 'Rook' },
  { piece: 'b', label: 'Bishop' },
  { piece: 'n', label: 'Knight' },
];

export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  isOpen,
  onSelect,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Promote pawn to">
      <div className="grid grid-cols-2 gap-2">
        {PROMOTION_OPTIONS.map(({ piece, label }) => (
          <Button key={piece} variant="secondary" onClick={() => onSelect(piece)}>
            {label}
          </Button>
        ))}
      </div>
    </Modal>
  );
};

export default PromotionDialog;
