/**
 * FSM State Node — High-fidelity SVG component for displaying an FSM state.
 * Supports:
 * - Selected state highlight (amber glow)
 * - Active simulation state highlight (emerald pulse)
 * - Initial state double-ring and start pointer arrow
 * - Final / Accept state double stroke
 * - Error highlight (crimson stroke)
 * - Unreachable / disabled dimming
 * - Moore output display & state encoding badge
 */
import React from 'react';
import type { FsmState } from '../../engine/fsmTypes';

interface FSMStateNodeProps {
  state: FsmState;
  encoding?: string;
  isSelected: boolean;
  isActive: boolean;
  hasError?: boolean;
  isUnreachable?: boolean;
  radius?: number;
  onMouseDown: (e: React.MouseEvent, stateId: string) => void;
  onClick: (e: React.MouseEvent, stateId: string) => void;
  onContextMenu?: (e: React.MouseEvent, stateId: string) => void;
}

export const FSMStateNode: React.FC<FSMStateNodeProps> = ({
  state,
  encoding,
  isSelected,
  isActive,
  hasError = false,
  isUnreachable = false,
  radius = 34,
  onMouseDown,
  onClick,
  onContextMenu,
}) => {
  // Theme-aware styles
  let fill = '#1e293b'; // slate-800
  let stroke = '#60a5fa'; // blue-400
  let strokeWidth = 2;
  let textFill = '#f8fafc';

  if (state.isInitial) {
    fill = '#064e3b'; // emerald-900
    stroke = '#34d399'; // emerald-400
  }

  if (hasError) {
    stroke = '#f87171'; // red-400
    strokeWidth = 2.5;
  }

  if (isSelected) {
    stroke = '#fbbf24'; // amber-400
    strokeWidth = 3;
  }

  if (isActive) {
    fill = '#047857'; // emerald-700
    stroke = '#6ee7b7'; // emerald-300
    strokeWidth = 3.5;
  }

  if (isUnreachable) {
    fill = '#18181b';
    stroke = '#71717a';
    textFill = '#a1a1aa';
  }

  return (
    <g
      transform={`translate(${state.x}, ${state.y})`}
      onMouseDown={e => onMouseDown(e, state.id)}
      onClick={e => onClick(e, state.id)}
      onContextMenu={e => onContextMenu?.(e, state.id)}
      style={{ cursor: 'grab', userSelect: 'none' }}
      className="fsm-state-node"
    >
      {/* Active Pulse Animation Filter */}
      {isActive && (
        <circle
          r={radius + 8}
          fill="none"
          stroke="#34d399"
          strokeWidth={2}
          opacity={0.6}
          style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}
        />
      )}

      {/* Initial State Incoming Arrow */}
      {state.isInitial && (
        <g transform={`translate(${-radius - 28}, 0)`}>
          <line
            x1={0}
            y1={0}
            x2={22}
            y2={0}
            stroke="#34d399"
            strokeWidth={2.5}
            markerEnd="url(#fsm-arr-initial)"
          />
        </g>
      )}

      {/* Main Node Circle */}
      <circle
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{ filter: isSelected ? 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))' : undefined }}
      />

      {/* Inner Ring for Initial or Final State */}
      {(state.isInitial || state.isFinal) && (
        <circle
          r={radius - 6}
          fill="none"
          stroke={state.isInitial ? '#34d399' : '#94a3b8'}
          strokeWidth={1.2}
          strokeDasharray={state.isFinal ? undefined : '3 2'}
        />
      )}

      {/* State Name */}
      <text
        x={0}
        y={state.output !== undefined || encoding ? -4 : 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={13}
        fontWeight={700}
        fill={textFill}
        fontFamily="ui-monospace, monospace"
      >
        {state.name}
      </text>

      {/* Subtext: Moore Output & Binary Encoding */}
      {(state.output !== undefined || encoding) && (
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill={isActive ? '#a7f3d0' : '#38bdf8'}
          fontFamily="ui-monospace, monospace"
        >
          {state.output !== undefined ? `out:${state.output}` : ''}
          {state.output !== undefined && encoding ? ' | ' : ''}
          {encoding ? `[${encoding}]` : ''}
        </text>
      )}
    </g>
  );
};
