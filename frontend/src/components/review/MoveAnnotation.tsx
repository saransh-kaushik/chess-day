import React from 'react';
import { MoveClassification } from '../../types/analysis';
import { CLASSIFICATION_LABELS, CLASSIFICATION_COLORS } from '../../config/constants';

interface MoveAnnotationProps {
  classification: MoveClassification;
  size?: 'sm' | 'md';
}

/**
 * Colored badge showing move classification (Best, Good, Inaccuracy, Mistake, Blunder).
 */
export const MoveAnnotation: React.FC<MoveAnnotationProps> = ({
  classification,
  size = 'sm',
}) => {
  const label = CLASSIFICATION_LABELS[classification] ?? classification;
  const color = CLASSIFICATION_COLORS[classification] ?? '#6b7280';

  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span
      className={`inline-flex items-center rounded font-semibold ${sizeClass}`}
      style={{ backgroundColor: color + '22', color }}
    >
      {label}
    </span>
  );
};
