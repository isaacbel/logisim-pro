/**
 * FSM Canvas — Interactive, high-performance SVG Diagram Editor for FSMs.
 * Provides:
 * - Pan & Zoom with hardware-accelerated transform
 * - Interactive node dragging with snapping
 * - Interactive transition creation via drag-connect
 * - Selection & Multi-selection
 * - Background grid
 * - Minimap overview
 */
import React, { useState, useRef, useCallback } from 'react';
import type { FsmMachine } from '../../engine/fsmTypes';
import type { Point2D } from '@apptypes/core';
import { FSMStateNode } from './FSMStateNode';
import { FSMTransitionEdge } from './FSMTransitionEdge';
import { encodeStates } from '../../engine/fsmEncoder';

interface FSMCanvasProps {
  machine: FsmMachine;
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  activeStateId: string | null;
  activeTransitionId: string | null;
  errorStateIds?: Set<string>;
  errorTransitionIds?: Set<string>;
  unreachableStateIds?: Set<string>;
  onSelectState: (id: string | null) => void;
  onSelectTransition: (id: string | null) => void;
  onMoveState: (id: string, x: number, y: number) => void;
  onAddTransition: (fromId: string, toId: string) => void;
  onAddStateAt: (x: number, y: number) => void;
}

export const FSMCanvas: React.FC<FSMCanvasProps> = ({
  machine,
  selectedStateId,
  selectedTransitionId,
  activeStateId,
  activeTransitionId,
  errorStateIds = new Set(),
  errorTransitionIds = new Set(),
  unreachableStateIds = new Set(),
  onSelectState,
  onSelectTransition,
  onMoveState,
  onAddTransition,
  onAddStateAt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport transformation
  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });

  // State node dragging
  const [dragState, setDragState] = useState<{ id: string; startWorld: Point2D; offset: Point2D } | null>(null);

  // Transition creation drag
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [connectPointerWorld, setConnectPointerWorld] = useState<Point2D | null>(null);

  // Encodings
  const encodingMap = encodeStates(machine.states, machine.encoding ?? 'binary');
  const stateById = new Map<string, typeof machine.states[0]>(machine.states.map(s => [s.id, s] as [string, typeof machine.states[0]]));

  // Screen -> World coordinate conversion
  const screenToWorld = useCallback((screenX: number, screenY: number): Point2D => {
    if (!svgRef.current) return { x: screenX, y: screenY };
    const rect = svgRef.current.getBoundingClientRect();
    const xRel = screenX - rect.left;
    const yRel = screenY - rect.top;
    return {
      x: (xRel - pan.x) / zoom,
      y: (yRel - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Wheel Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = Math.max(0.3, Math.min(3.0, zoom * zoomFactor));

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards cursor
    setPan(prev => ({
      x: mouseX - (mouseX - prev.x) * (nextZoom / zoom),
      y: mouseY - (mouseY - prev.y) * (nextZoom / zoom),
    }));
    setZoom(nextZoom);
  }, [zoom]);

  // Pointer Down on background
  const handleBgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Pan mode
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.button === 0) {
      onSelectState(null);
      onSelectTransition(null);
    }
  }, [pan, onSelectState, onSelectTransition]);

  // Pointer Move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    if (dragState) {
      const snapGrid = 10;
      const rawX = world.x - dragState.offset.x;
      const rawY = world.y - dragState.offset.y;
      const snappedX = Math.round(rawX / snapGrid) * snapGrid;
      const snappedY = Math.round(rawY / snapGrid) * snapGrid;
      onMoveState(dragState.id, snappedX, snappedY);
    }

    if (connectingFromId) {
      setConnectPointerWorld(world);
    }
  }, [isPanning, panStart, dragState, connectingFromId, screenToWorld, onMoveState]);

  // Pointer Up
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (dragState) {
      setDragState(null);
    }
    if (connectingFromId) {
      // If dropped over a state, create transition
      const world = screenToWorld(e.clientX, e.clientY);
      for (const s of machine.states) {
        const dist = Math.hypot(s.x - world.x, s.y - world.y);
        if (dist <= 34) {
          onAddTransition(connectingFromId, s.id);
          break;
        }
      }
      setConnectingFromId(null);
      setConnectPointerWorld(null);
    }
  }, [isPanning, dragState, connectingFromId, screenToWorld, machine.states, onAddTransition]);

  // State node mousedown
  const handleStateMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (e.shiftKey) {
      // Shift+drag creates transition
      setConnectingFromId(id);
      const world = screenToWorld(e.clientX, e.clientY);
      setConnectPointerWorld(world);
      return;
    }

    onSelectState(id);
    onSelectTransition(null);
    const world = screenToWorld(e.clientX, e.clientY);
    const s = stateById.get(id);
    if (s) {
      setDragState({
        id,
        startWorld: { x: s.x, y: s.y },
        offset: { x: world.x - s.x, y: world.y - s.y },
      });
    }
  }, [screenToWorld, onSelectState, onSelectTransition, stateById]);

  // Double click background to add state
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    onAddStateAt(Math.round(world.x), Math.round(world.y));
  }, [screenToWorld, onAddStateAt]);

  // Compute curvature offsets for parallel edges between same pairs of states
  const transitionCurvatures = React.useMemo(() => {
    const pairCounts = new Map<string, number>();
    const offsets = new Map<string, number>();
    const selfCounts = new Map<string, number>();
    const selfIndices = new Map<string, number>();

    // Count transitions
    for (const tr of machine.transitions) {
      if (tr.fromState === tr.toState) {
        const count = selfCounts.get(tr.fromState) ?? 0;
        selfIndices.set(tr.id, count);
        selfCounts.set(tr.fromState, count + 1);
        continue;
      }
      // Symmetric pair key
      const key = tr.fromState < tr.toState ? `${tr.fromState}->${tr.toState}` : `${tr.toState}->${tr.fromState}`;
      const count = pairCounts.get(key) ?? 0;
      pairCounts.set(key, count + 1);
    }

    // Assign offsets
    const pairIndex = new Map<string, number>();
    for (const tr of machine.transitions) {
      if (tr.fromState === tr.toState) continue;
      const key = tr.fromState < tr.toState ? `${tr.fromState}->${tr.toState}` : `${tr.toState}->${tr.fromState}`;
      const idx = pairIndex.get(key) ?? 0;
      pairIndex.set(key, idx + 1);

      const total = pairCounts.get(key) ?? 1;
      let offset = 0;
      if (total === 1) {
        offset = 0;
      } else {
        // Fan out symmetrically: -25, +25, -50, +50
        const step = (idx - (total - 1) / 2) * 32;
        offset = step === 0 ? 16 : step;
      }
      // If from > to, reverse normal offset so edges don't collide
      if (tr.fromState > tr.toState) offset = -offset;
      offsets.set(tr.id, offset);
    }

    return { offsets, selfIndices };
  }, [machine.transitions]);

  const connectingSourceState = connectingFromId ? stateById.get(connectingFromId) : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#090d16',
        cursor: isPanning ? 'grabbing' : 'default',
      }}
      onWheel={handleWheel}
      onMouseDown={handleBgMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          {/* Grid pattern */}
          <pattern
            id="fsm-grid-pattern"
            width={20 * zoom}
            height={20 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (20 * zoom)}, ${pan.y % (20 * zoom)})`}
          >
            <circle cx={1 * zoom} cy={1 * zoom} r={1 * zoom} fill="rgba(255, 255, 255, 0.08)" />
          </pattern>

          {/* Arrow markers */}
          <marker id="fsm-arr-default" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
          </marker>
          <marker id="fsm-arr-selected" markerWidth="9" markerHeight="9" refX="8" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L9,3.5 z" fill="#fbbf24" />
          </marker>
          <marker id="fsm-arr-active" markerWidth="9" markerHeight="9" refX="8" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L9,3.5 z" fill="#34d399" />
          </marker>
          <marker id="fsm-arr-error" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#f87171" />
          </marker>
          <marker id="fsm-arr-initial" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#34d399" />
          </marker>
          <marker id="fsm-arr-preview" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* Background Grid */}
        <rect width="100%" height="100%" fill="url(#fsm-grid-pattern)" />

        {/* Scaled & Translated World Space */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Transitions */}
          {machine.transitions.map(tr => {
            const from = stateById.get(tr.fromState);
            const to = stateById.get(tr.toState);
            if (!from || !to) return null;

            return (
              <FSMTransitionEdge
                key={tr.id}
                transition={tr}
                fromPos={{ x: from.x, y: from.y }}
                toPos={{ x: to.x, y: to.y }}
                isMoore={machine.type === 'Moore'}
                isSelected={tr.id === selectedTransitionId}
                isActive={tr.id === activeTransitionId}
                hasError={errorTransitionIds.has(tr.id)}
                curvatureOffset={transitionCurvatures.offsets.get(tr.id) ?? 0}
                loopIndex={transitionCurvatures.selfIndices.get(tr.id) ?? 0}
                onClick={(e, trId) => {
                  e.stopPropagation();
                  onSelectTransition(trId);
                  onSelectState(null);
                }}
              />
            );
          })}

          {/* Interactive Connection Preview Line */}
          {connectingSourceState && connectPointerWorld && (
            <line
              x1={connectingSourceState.x}
              y1={connectingSourceState.y}
              x2={connectPointerWorld.x}
              y2={connectPointerWorld.y}
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="4 4"
              markerEnd="url(#fsm-arr-preview)"
            />
          )}

          {/* State Nodes */}
          {machine.states.map(state => (
            <FSMStateNode
              key={state.id}
              state={state}
              encoding={encodingMap.get(state.id)}
              isSelected={state.id === selectedStateId}
              isActive={state.id === activeStateId}
              hasError={errorStateIds.has(state.id)}
              isUnreachable={unreachableStateIds.has(state.id)}
              onMouseDown={handleStateMouseDown}
              onClick={(e, id) => {
                e.stopPropagation();
                onSelectState(id);
                onSelectTransition(null);
              }}
            />
          ))}
        </g>
      </svg>

      {/* Floating Canvas Controls (Zoom, Fit, Quick Help) */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          borderRadius: 8,
          padding: '4px 6px',
        }}
      >
        <button
          onClick={() => setZoom(z => Math.min(3.0, z * 1.2))}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}
          title="Zoom In"
        >
          +
        </button>
        <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center', minWidth: 38, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.max(0.3, z / 1.2))}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
          style={{ background: 'transparent', border: 'none', color: '#38bdf8', padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          title="Reset View"
        >
          Fit
        </button>
      </div>

      {/* Hint Badge */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(15, 23, 42, 0.75)',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 11,
          color: '#64748b',
          pointerEvents: 'none',
        }}
      >
        Double-click to create state • Shift+drag to connect states
      </div>
    </div>
  );
};
