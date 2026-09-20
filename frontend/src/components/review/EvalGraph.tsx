import React, { useRef } from 'react';

interface EvalGraphProps {
  /** Centipawn evaluations per half-move, from White's perspective */
  evaluations: number[];
  currentMove: number;
  onMoveClick: (index: number) => void;
}

/**
 * SVG evaluation graph. White advantage = above midline (white fill),
 * black advantage = below midline (dark fill). Clipped to ±10 pawns.
 */
export const EvalGraph: React.FC<EvalGraphProps> = ({
  evaluations,
  currentMove,
  onMoveClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const WIDTH = 600;
  const HEIGHT = 120;
  const PADDING = { top: 8, bottom: 8, left: 4, right: 4 };
  const INNER_W = WIDTH - PADDING.left - PADDING.right;
  const INNER_H = HEIGHT - PADDING.top - PADDING.bottom;
  const MID_Y = PADDING.top + INNER_H / 2;

  const MAX_EVAL = 1000; // centipawns (10 pawns)

  const clamp = (v: number) => Math.max(-MAX_EVAL, Math.min(MAX_EVAL, v));

  const evalToY = (cp: number) => {
    const clamped = clamp(cp);
    // +MAX_EVAL → top, -MAX_EVAL → bottom
    return PADDING.top + ((MAX_EVAL - clamped) / (2 * MAX_EVAL)) * INNER_H;
  };

  const indexToX = (i: number) => {
    if (evaluations.length <= 1) return PADDING.left + INNER_W / 2;
    return PADDING.left + (i / (evaluations.length - 1)) * INNER_W;
  };

  // Build SVG path string
  const buildPath = () => {
    if (evaluations.length === 0) return '';
    return evaluations
      .map((cp, i) => `${i === 0 ? 'M' : 'L'} ${indexToX(i)} ${evalToY(cp)}`)
      .join(' ');
  };

  // Build white-advantage filled area (above midline)
  const buildWhiteArea = () => {
    if (evaluations.length === 0) return '';
    const pts = evaluations.map((cp, i) => ({
      x: indexToX(i),
      y: Math.min(evalToY(cp), MID_Y),
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return `${path} L ${pts[pts.length - 1].x} ${MID_Y} L ${pts[0].x} ${MID_Y} Z`;
  };

  // Build black-advantage filled area (below midline)
  const buildBlackArea = () => {
    if (evaluations.length === 0) return '';
    const pts = evaluations.map((cp, i) => ({
      x: indexToX(i),
      y: Math.max(evalToY(cp), MID_Y),
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return `${path} L ${pts[pts.length - 1].x} ${MID_Y} L ${pts[0].x} ${MID_Y} Z`;
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || evaluations.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const fraction = (clickX - PADDING.left) / INNER_W;
    const index = Math.round(fraction * (evaluations.length - 1));
    onMoveClick(Math.max(0, Math.min(evaluations.length - 1, index)));
  };

  const currentX =
    evaluations.length > 0 && currentMove > 0
      ? indexToX(Math.min(currentMove - 1, evaluations.length - 1))
      : null;

  if (evaluations.length === 0) {
    return (
      <div className="h-24 bg-gray-800 rounded flex items-center justify-center text-gray-500 text-sm">
        No evaluation data yet
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-24 rounded cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Background */}
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#1f2937" />

      {/* Black advantage area */}
      <path d={buildBlackArea()} fill="#374151" />

      {/* White advantage area */}
      <path d={buildWhiteArea()} fill="#e5e7eb" />

      {/* Midline */}
      <line
        x1={PADDING.left}
        y1={MID_Y}
        x2={PADDING.left + INNER_W}
        y2={MID_Y}
        stroke="#6b7280"
        strokeWidth={0.5}
      />

      {/* Eval curve */}
      <path d={buildPath()} fill="none" stroke="#9ca3af" strokeWidth={1} />

      {/* Current move indicator */}
      {currentX !== null && (
        <line
          x1={currentX}
          y1={PADDING.top}
          x2={currentX}
          y2={PADDING.top + INNER_H}
          stroke="#f59e0b"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
};
