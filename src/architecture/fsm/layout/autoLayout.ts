/**
 * FSM Auto-Layout Engine — Implements multiple layout strategies:
 * - Circular Layout
 * - Hierarchical Layered Layout (top-to-bottom or left-to-right DAG)
 * - Grid Layout
 * - Force-Directed Physics Layout (spring-embedder)
 */
import type { FsmMachine, FsmState } from '../../engine/fsmTypes';
import { resolveCollisions } from './collisionResolver';

export type FsmLayoutStrategy = 'circular' | 'hierarchical' | 'grid' | 'force';

/**
 * 1. Circular Layout
 * Places states evenly around a circle centered in the viewport.
 */
export function circularLayout(
  machine: FsmMachine,
  cx = 400,
  cy = 300,
  radius?: number
): FsmState[] {
  const n = machine.states.length;
  if (n === 0) return [];
  if (n === 1) return [{ ...machine.states[0], x: cx, y: cy }];

  const r = radius ?? Math.max(160, n * 36);
  // Put initial state at the top (-PI/2)
  const initialIdx = machine.states.findIndex(s => s.isInitial);
  const offsetAngle = initialIdx >= 0 ? -Math.PI / 2 - (initialIdx / n) * 2 * Math.PI : -Math.PI / 2;

  const states = machine.states.map((s, i) => {
    const angle = offsetAngle + (i / n) * 2 * Math.PI;
    return {
      ...s,
      x: Math.round(cx + r * Math.cos(angle)),
      y: Math.round(cy + r * Math.sin(angle)),
    };
  });

  return resolveCollisions(states, 90);
}

/**
 * 2. Hierarchical Layered Layout
 * Uses topological / BFS layering starting from initial state.
 */
export function hierarchicalLayout(
  machine: FsmMachine,
  startX = 100,
  startY = 100,
  layerSpacing = 160,
  nodeSpacing = 140
): FsmState[] {
  if (machine.states.length === 0) return [];

  const initial = machine.states.find(s => s.isInitial) ?? machine.states[0];
  const layers: string[][] = [];
  const visited = new Set<string>();

  // Layer 0: initial state
  layers.push([initial.id]);
  visited.add(initial.id);

  let currentLayer = [initial.id];
  while (currentLayer.length > 0 && visited.size < machine.states.length) {
    const nextLayer: string[] = [];
    for (const id of currentLayer) {
      const outgoing = machine.transitions.filter(t => t.fromState === id);
      for (const edge of outgoing) {
        if (!visited.has(edge.toState)) {
          visited.add(edge.toState);
          nextLayer.push(edge.toState);
        }
      }
    }
    if (nextLayer.length > 0) {
      layers.push(nextLayer);
      currentLayer = nextLayer;
    } else {
      // Add unvisited disconnected states in a separate layer
      const unvisited = machine.states.filter(s => !visited.has(s.id));
      if (unvisited.length > 0) {
        const remainingIds = unvisited.map(s => s.id);
        remainingIds.forEach(id => visited.add(id));
        layers.push(remainingIds);
      }
      break;
    }
  }

  const stateById = new Map<string, FsmState>(machine.states.map(s => [s.id, s] as [string, FsmState]));
  const result: FsmState[] = [];

  layers.forEach((layer, layerIdx) => {
    const layerWidth = (layer.length - 1) * nodeSpacing;
    const layerStartX = Math.max(startX, 400 - layerWidth / 2);

    layer.forEach((id, nodeIdx) => {
      const s = stateById.get(id)!;
      result.push({
        ...s,
        x: Math.round(layerStartX + nodeIdx * nodeSpacing),
        y: Math.round(startY + layerIdx * layerSpacing),
      });
    });
  });

  return resolveCollisions(result, 90);
}

/**
 * 3. Grid Layout
 * Arranges states in a clean rectangular grid.
 */
export function gridLayout(
  machine: FsmMachine,
  startX = 120,
  startY = 120,
  spacing = 160
): FsmState[] {
  const n = machine.states.length;
  if (n === 0) return [];
  const cols = Math.ceil(Math.sqrt(n));

  return machine.states.map((s, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      ...s,
      x: startX + col * spacing,
      y: startY + row * spacing,
    };
  });
}

/**
 * 4. Force-Directed Layout
 * Simulates spring-repulsion physics to untangle transitions and reduce edge crossings.
 */
export function forceDirectedLayout(
  machine: FsmMachine,
  width = 800,
  height = 600,
  iterations = 60
): FsmState[] {
  const n = machine.states.length;
  if (n <= 1) return circularLayout(machine, width / 2, height / 2);

  // Initialize with circular layout
  let states = circularLayout(machine, width / 2, height / 2);

  const k = Math.sqrt((width * height) / n); // Optimal distance
  const stateIndex = new Map<string, number>(states.map((s, i) => [s.id, i] as [string, number]));

  for (let iter = 0; iter < iterations; iter++) {
    const temp = ((iterations - iter) / iterations) * 20; // Cooling temperature
    const disp: { dx: number; dy: number }[] = states.map(() => ({ dx: 0, dy: 0 }));

    // Repulsive forces between all node pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = states[i].x - states[j].x;
        const dy = states[i].y - states[j].y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = (k * k) / dist;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        disp[i].dx += fx;
        disp[i].dy += fy;
        disp[j].dx -= fx;
        disp[j].dy -= fy;
      }
    }

    // Attractive forces along transitions
    for (const tr of machine.transitions) {
      const u = stateIndex.get(tr.fromState);
      const v = stateIndex.get(tr.toState);
      if (u === undefined || v === undefined || u === v) continue;

      const dx = states[v].x - states[u].x;
      const dy = states[v].y - states[u].y;
      const dist = Math.hypot(dx, dy) || 1;
      const force = (dist * dist) / k;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      disp[u].dx += fx;
      disp[u].dy += fy;
      disp[v].dx -= fx;
      disp[v].dy -= fy;
    }

    // Apply displacement with bounds clamping
    states = states.map((s, i) => {
      const d = Math.hypot(disp[i].dx, disp[i].dy) || 1;
      const limitedDist = Math.min(d, temp);
      const nx = s.x + (disp[i].dx / d) * limitedDist;
      const ny = s.y + (disp[i].dy / d) * limitedDist;

      return {
        ...s,
        x: Math.max(80, Math.min(width - 80, nx)),
        y: Math.max(80, Math.min(height - 80, ny)),
      };
    });
  }

  return resolveCollisions(states, 90);
}

/**
 * Apply selected auto-layout strategy to an FSM Machine.
 */
export function applyAutoLayout(
  machine: FsmMachine,
  strategy: FsmLayoutStrategy = 'circular',
  width = 800,
  height = 600
): FsmMachine {
  let updatedStates: FsmState[];
  switch (strategy) {
    case 'hierarchical':
      updatedStates = hierarchicalLayout(machine);
      break;
    case 'grid':
      updatedStates = gridLayout(machine);
      break;
    case 'force':
      updatedStates = forceDirectedLayout(machine, width, height);
      break;
    case 'circular':
    default:
      updatedStates = circularLayout(machine, width / 2, height / 2);
      break;
  }

  return {
    ...machine,
    states: updatedStates,
  };
}
