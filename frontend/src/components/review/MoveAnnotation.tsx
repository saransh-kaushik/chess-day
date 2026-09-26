import React from 'react';
import { MoveClassification } from '../../types/analysis';
import { CLASSIFICATION_SYMBOLS, CLASSIFICATION_COLORS } from '../../config/constants';

interface MoveAnnotationProps {
  classification: MoveClassification;
  /** 'badge' = circular icon (chess.com style), 'inline' = small inline symbol */
  variant?: 'badge' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Chess.com-style move annotation badge.
 * - badge variant: circular icon with symbol (used in move list / analysis card)
 * - inline variant: compact symbol used inline in buttons
 */
export const MoveAnnotation: React.FC<MoveAnnotationProps> = ({
  classification,
  variant = 'badge',
  size = 'sm',
}) => {
  const symbol = CLASSIFICATION_SYMBOLS[classification] ?? '?';
  const color = CLASSIFICATION_COLORS[classification] ?? '#6b7280';

  if (variant === 'inline') {
    const textSize = size === 'lg' ? 'text-base' : size === 'md' ? 'text-sm' : 'text-xs';
    return (
      <span
        className={`inline-flex items-center justify-center font-bold leading-none ${textSize}`}
        style={{ color }}
        aria-label={classification}
      >
        {symbol}
      </span>
    );
  }

  // Badge variant — circular, chess.com style
  const dims =
    size === 'lg'
      ? 'w-8 h-8 text-base'
      : size === 'md'
      ? 'w-6 h-6 text-sm'
      : 'w-5 h-5 text-xs';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold leading-none flex-shrink-0 ${dims}`}
      style={{ backgroundColor: color + '28', color, border: `1.5px solid ${color}55` }}
      aria-label={classification}
      title={classification.charAt(0) + classification.slice(1).toLowerCase()}
    >
      {symbol}
    </span>
  );
};
