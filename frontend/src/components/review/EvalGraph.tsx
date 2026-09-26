import React, { useRef } from 'react';
import { MoveAnalysis } from '../../types/analysis';

interface EvalGraphProps {
  /** Centipawn evaluations per half-move, from White's perspective */
  evaluations: number[];
  /** Full move analyses for classification dot rendering */
  moveAnalyses?: MoveAnalysis[];
  currentMove: number;
  onMoveClick: (index: number) => void;
}

/**
 * Chess.com-style SVG evaluation graph.
 * - Gradient fills: white advantage = light, black = dark
 * - Red dots for blunders, orange for mistakes
 * - Amber vertical line for current position
 * - Bezier smooth curves
 * - Grid lines at ±3 and ±6 pawns
 * - Hover tooltip with move number (SVG title)
 */
export const EvalGraph: React.FC<EvalGraphProps> = ({
  evaluations,
  moveAnalyses = [],
  currentMove,
  onMoveClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const WIDTH = 600;
  const HEIGHT = 160;
  const PAD = { top: 10, bottom: 10, left: 6, right: 6 };
  const INNER_W = WIDTH - PAD.left - PAD.right;
  const INNER_H = HEIGHT - PAD.top - PAD.bottom;
  const MID_Y = PAD.top + INNER_H / 2;

  const MAX_CP = 1000; // 10 pawns

  const clamp = (v: number) => Math.max(-MAX_CP, Math.min(MAX_CP, v));

  const evalToY = (cp: number) => {
    const c = clamp(cp);
    return PAD.top + ((MAX_CP - c) / (2 * MAX_CP)) * INNER_H;
  };

  const indexToX = (i: number) => {
    if (evaluations.length <= 1) return PAD.left + INNER_W / 2;
    return PAD.left + (i / (evaluations.length - 1)) * INNER_W;
  };

  /** Build a smooth cubic bezier SVG path through all points */
  const buildSmoothedPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const points = evaluations.map((cp, i) => ({ x: indexToX(i), y: evalToY(cp) }));

  // White advantage area (above midline → y < MID_Y)
  const whitePoints = points.map((p) => ({ ...p, y: Math.min(p.y, MID_Y) }));
  const blackPoints = points.map((p) => ({ ...p, y: Math.max(p.y, MID_Y) }));

  const whiteAreaPath =
    points.length > 0
      ? `${buildSmoothedPath(whitePoints)} L ${whitePoints[whitePoints.length - 1].x} ${MID_Y} L ${whitePoints[0].x} ${MID_Y} Z`
      : '';

  const blackAreaPath =
    points.length > 0
      ? `${buildSmoothedPath(blackPoints)} L ${blackPoints[blackPoints.length - 1].x} ${MID_Y} L ${blackPoints[0].x} ${MID_Y} Z`
      : '';

  const linePath = buildSmoothedPath(points);

  // Grid lines at ±3 and ±6 pawns
  const gridLines = [300, 600, -300, -600].map((cp) => ({
    y: evalToY(cp),
    label: cp > 0 ? `+${cp / 100}` : `${cp / 100}`,
  }));

  // Current position vertical line
  const currentX =
    evaluations.length > 0 && currentMove > 0
      ? indexToX(Math.min(currentMove - 1, evaluations.length - 1))
      : null;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || evaluations.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const fraction = (clickX - PAD.left) / INNER_W;
    const index = Math.round(fraction * (evaluations.length - 1));
    onMoveClick(Math.max(0, Math.min(evaluations.length - 1, index)));
  };

  if (evaluations.length === 0) {
    return (
      <div className="h-32 bg-gray-800 rounded flex items-center justify-center text-gray-500 text-sm">
        No evaluation data yet
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-32 rounded cursor-pointer select-none"
      onClick={handleClick}
    >
      <defs>
        {/* White area gradient */}
        <linearGradient id="whiteGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.7" />
        </linearGradient>
        {/* Black area gradient */}
        <linearGradient id="blackGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#374151" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1f2937" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#111827" rx={4} />

      {/* Grid lines at ±3 and ±6 */}
      {gridLines.map((gl, i) => (
        <line
          key={i}
          x1={PAD.left}
          y1={gl.y}
          x2={PAD.left + INNER_W}
          y2={gl.y}
          stroke="#374151"
          strokeWidth={0.75}
          strokeDasharray="4 4"
        />
      ))}

      {/* Black advantage fill */}
      <path d={blackAreaPath} fill="url(#blackGrad)" />

      {/* White advantage fill */}
      <path d={whiteAreaPath} fill="url(#whiteGrad)" />

      {/* Midline */}
      <line
        x1={PAD.left}
        y1={MID_Y}
        x2={PAD.left + INNER_W}
        y2={MID_Y}
        stroke="#6b7280"
        strokeWidth={1}
      />

      {/* Eval curve */}
      <path d={linePath} fill="none" stroke="#9ca3af" strokeWidth={1.2} />

      {/* Classification dots for notable moves */}
      {moveAnalyses.map((ma, i) => {
        const dotColor: Record<string, string> = {
          BLUNDER: '#ef4444',
          MISTAKE: '#f97316',
          INACCURACY: '#f0a500',
          BEST: '#f7c948',
          BRILLIANT: '#1eddb8',
        };
        const fill = dotColor[ma.classification];
        if (!fill) return null;
        const x = indexToX(i);
        const y = evalToY(evaluations[i] ?? 0);
        const r = ma.classification === 'BLUNDER' ? 5 : ma.classification === 'MISTAKE' ? 4 : 3.5;
        const moveLabel = `Move ${ma.moveNumber}${ma.color === 'black' ? '...' : '.'} ${ma.san} (${ma.classification})`;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={fill} stroke="#111827" strokeWidth={1} />
            <title>{moveLabel}</title>
          </g>
        );
      })}


      {/* Invisible hit-target rects for tooltip on each move */}
      {evaluations.map((cp, i) => {
        const x = indexToX(i);
        const ma = moveAnalyses[i];
        const label = ma
          ? `Move ${ma.moveNumber}${ma.color === 'black' ? '...' : '.'} ${ma.san} (${cp > 0 ? '+' : ''}${(cp / 100).toFixed(2)})`
          : `Move ${i + 1} (${cp > 0 ? '+' : ''}${(cp / 100).toFixed(2)})`;
        const segW = evaluations.length > 1 ? INNER_W / (evaluations.length - 1) : INNER_W;
        return (
          <rect
            key={i}
            x={x - segW / 2}
            y={PAD.top}
            width={segW}
            height={INNER_H}
            fill="transparent"
          >
            <title>{label}</title>
          </rect>
        );
      })}

      {/* Current position amber line */}
      {currentX !== null && (
        <line
          x1={currentX}
          y1={PAD.top}
          x2={currentX}
          y2={PAD.top + INNER_H}
          stroke="#f59e0b"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};
