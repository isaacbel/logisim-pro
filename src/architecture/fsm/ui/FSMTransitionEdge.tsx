/**
 * FSM Transition Edge — High-performance SVG edge component.
 * Renders curved Bezier paths, self-loops, arrowhead markers,
 * and legible condition/output labels.
 */
import React from 'react';
import type { FsmTransition } from '../../engine/fsmTypes';
import type { Point2D } from '@apptypes/core';
import { computeCurvedEdge, computeSelfLoopPath } from '../layout/edgeRouter';

interface FSMTransitionEdgeProps {
  transition: FsmTransition;
  fromPos: Point2D;
  toPos: Point2D;
  isMoore: boolean;
  isSelected: boolean;
  isActive: boolean;
  hasError?: boolean;
  curvatureOffset?: number;
  loopIndex?: number;
  nodeRadius?: number;
  onClick: (e: React.MouseEvent, trId: string) => void;
}

export const FSMTransitionEdge: React.FC<FSMTransitionEdgeProps> = ({
  transition,
  fromPos,
  toPos,
  isMoore,
  isSelected,
  isActive,
  hasError = false,
  curvatureOffset = 0,
  loopIndex = 0,
  nodeRadius = 34,
  onClick,
}) => {
  const isSelf = transition.fromState === transition.toState;

  // Label text formatting: input/output for Mealy, input only for Moore
  const labelText = isMoore
    ? transition.input
    : transition.output
    ? `${transition.input}/${transition.output}`
    : transition.input;

  let stroke = '#64748b'; // slate-500
  let strokeWidth = 1.8;
  let markerId = 'fsm-arr-default';

  if (hasError) {
    stroke = '#f87171'; // red-400
    markerId = 'fsm-arr-error';
  }

  if (isSelected) {
    stroke = '#fbbf24'; // amber-400
    strokeWidth = 2.8;
    markerId = 'fsm-arr-selected';
  }

  if (isActive) {
    stroke = '#34d399'; // emerald-400
    strokeWidth = 3;
    markerId = 'fsm-arr-active';
  }

  if (isSelf) {
    const { pathD, labelPos } = computeSelfLoopPath(fromPos, nodeRadius, loopIndex);
    return (
      <g
        onClick={e => onClick(e, transition.id)}
        style={{ cursor: 'pointer' }}
        className="fsm-transition-edge"
      >
        {/* Wider transparent hit zone */}
        <path d={pathD} fill="none" stroke="transparent" strokeWidth={16} />
        {/* Rendered path */}
        <path
          d={pathD}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          markerEnd={`url(#${markerId})`}
        />
        {/* Label background badge */}
        <rect
          x={labelPos.x - (labelText.length * 4.5) - 4}
          y={labelPos.y - 8}
          width={labelText.length * 9 + 8}
          height={16}
          rx={4}
          fill="#0f172a"
          stroke={isSelected ? '#fbbf24' : '#334155'}
          strokeWidth={1}
          opacity={0.9}
        />
        <text
          x={labelPos.x}
          y={labelPos.y + 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill={isActive ? '#34d399' : isSelected ? '#fbbf24' : '#e2e8f0'}
          fontFamily="ui-monospace, monospace"
        >
          {labelText}
        </text>
      </g>
    );
  }

  const { pathD, labelPos } = computeCurvedEdge(
    fromPos,
    toPos,
    nodeRadius,
    curvatureOffset
  );

  return (
    <g
      onClick={e => onClick(e, transition.id)}
      style={{ cursor: 'pointer' }}
      className="fsm-transition-edge"
    >
      {/* Invisible wider hit area for easy clicking */}
      <path d={pathD} fill="none" stroke="transparent" strokeWidth={16} />
      {/* Visual edge */}
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        markerEnd={`url(#${markerId})`}
        style={isActive ? { strokeDasharray: '6 4', animation: 'dash 1s linear infinite' } : undefined}
      />
      {/* Label Badge */}
      <rect
        x={labelPos.x - (labelText.length * 4.2) - 4}
        y={labelPos.y - 8}
        width={labelText.length * 8.4 + 8}
        height={16}
        rx={4}
        fill="#0f172a"
        stroke={isSelected ? '#fbbf24' : '#334155'}
        strokeWidth={1}
        opacity={0.92}
      />
      <text
        x={labelPos.x}
        y={labelPos.y + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={isActive ? '#34d399' : isSelected ? '#fbbf24' : '#e2e8f0'}
        fontFamily="ui-monospace, monospace"
      >
        {labelText}
      </text>
    </g>
  );
};
