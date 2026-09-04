import { create } from 'zustand';
import type {
  Project, Circuit, EditorState, EditorTool, SimulationState, ViewportState,
  CircuitComponent, Wire, SelectionState, WaveformProbe, ThemeMode, AppLanguage,
  HazardReport, RenderStats, SignalValue, PropertyValue, Point2D, RoutingMode,
} from '@apptypes/core';
import { nanoid } from 'nanoid';
import { setLanguage } from '@utils/i18n';
import { createPins, createComponent } from '@core/components/factory';
import { getPinWorldPosition, getComponentWorldBounds } from '@utils/math';
import { routeWire } from '@engine/routing/wireRouter';

export type AppMode = 'welcome' | 'simulator' | 'architecture';
export type ArchPage =
  | 'dashboard'
  | 'number-systems'
  | 'binary-arithmetic'
  | 'signed-numbers'
  | 'fixed-point'
  | 'ieee754'
  | 'special-codes'
  | 'boolean-algebra'
  // ── 8086 Laboratory ──────────────────────────────────────────────
  | '8086-overview'
  | '8086-registers'
  | '8086-flags'
  | '8086-alu'
  | '8086-memory'
  | '8086-segmentation'
  | '8086-biu-eu'
  | '8086-datapath'
  | '8086-control-unit'
  | '8086-assembly'
  | '8086-debugger'
  | '8086-stack'
  | '8086-instruction-explorer'
  | '8086-addressing-modes'
  | '8086-io'
  | '8086-timing'
  | '8086-exercises'
  // ── Legacy Generic Labs (preserved) ──────────────────────────────
  | 'alu'
  | 'register-file'
  | 'datapath'
  | 'control-unit'
  | 'cpu'
  | 'assembly'
  // ── FSM Designer ─────────────────────────────────────────────────
  | 'fsm-designer';

export interface AppState {
  // ── Application navigation ───────────────────────────────────────────────
  appMode: AppMode;
  archPage: ArchPage;
  archInspectorValue: string | null; // binary string sent from circuit for analysis

  // Data
  project: Project | null;
  currentCircuitId: string | null;

  /**
   * Monotonically-incrementing counter that bumps on every circuit mutation.
   * SimulationService compares this instead of JSON.stringify-ing the whole circuit.
   */
  circuitVersion: number;

  // Editor UI state
  editor: EditorState;
  viewport: ViewportState;
  simulation: SimulationState;
  selection: SelectionState;

  // Waveform probes
  probes: WaveformProbe[];

  // Theme & Language
  theme: ThemeMode;
  language: AppLanguage;

  // Render stats (from canvas)
  renderStats: RenderStats;

  // Console log & history
  consoleMessages: { level: 'info' | 'warn' | 'error'; text: string; tick: number }[];
  historyPast: Circuit[];
  historyFuture: Circuit[];

  // ── Project actions ──────────────────────────────────────────────────────
  setProject: (p: Project) => void;
  setCurrentCircuit: (id: string) => void;
  addCircuit: (name: string) => string;
  removeCircuit: (id: string) => void;
  renameCircuit: (id: string, name: string) => void;
  createSubcircuitInstance: (subcircuitId: string, x: number, y: number) => void;
  newProject: () => void;
  loadProjectFile: (project: Project, probes?: WaveformProbe[], viewport?: ViewportState) => void;

  // ── Editor actions ───────────────────────────────────────────────────────
  setTool: (tool: EditorTool) => void;
  setActiveBottomTab: (tab: EditorState['activeBottomTab']) => void;

  // ── Component & wire mutations ───────────────────────────────────────────
  addComponent: (c: CircuitComponent) => void;
  removeComponent: (id: string) => void;
  rotateComponent: (id: string, angleDelta?: number) => void;
  rotateSelectedComponents: (angleDelta?: number) => void;
  updateComponentProperty: (id: string, key: string, value: unknown) => void;
  updateComponentLabel: (id: string, label: string) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  moveSelectedComponents: (dx: number, dy: number) => void;
  commitDrag: (origins: Map<string, { x: number; y: number }>, dx: number, dy: number, gridSize: number) => void;
  addWire: (w: Wire) => void;
  removeWire: (id: string) => void;
  updateWireWaypoints: (wireId: string, waypoints: Point2D[], routingMode?: RoutingMode) => void;
  addWireJunction: (wireId: string, junction: Point2D) => void;
  rerouteWires: () => void;

  // ── Selection ────────────────────────────────────────────────────────────
  selectComponent: (id: string, addToSelection?: boolean) => void;
  selectWire: (id: string, addToSelection?: boolean) => void;
  selectInBox: (box: { x: number; y: number; width: number; height: number }, addToSelection?: boolean) => void;
  clearSelection: () => void;
  setSelectionBox: (box: SelectionState['selectionBox']) => void;
  deleteSelected: () => void;

  // ── Clipboard & Editing ──────────────────────────────────────────────────
  copySelected: () => void;
  cutSelected: () => void;
  paste: () => void;
  duplicateSelected: () => void;

  // ── Undo/Redo ────────────────────────────────────────────────────────────
  undo: () => void;
  redo: () => void;

  // ── Viewport ─────────────────────────────────────────────────────────────
  setViewport: (v: Partial<ViewportState>) => void;
  setZoom: (zoom: number) => void;

  // ── Simulation state ─────────────────────────────────────────────────────
  setSimulationState: (s: Partial<SimulationState>) => void;
  applySimulationSnapshot: (snapshot: { state: SimulationState; pinValues: [string, SignalValue][]; wireValues: [string, SignalValue][]; hazards: SimulationState['detectedHazards']; oscillations: SimulationState['detectedOscillations'] }) => void;
  addHazard: (h: HazardReport) => void;

  // ── Probes ───────────────────────────────────────────────────────────────
  addProbe: (pinId: string, label: string) => void;
  removeProbe: (id: string) => void;
  updateProbeHistory: (pinId: string, value: SignalValue) => void;

  // ── Theme & Language ──────────────────────────────────────────────────────
  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: AppLanguage) => void;

  // ── Render stats ──────────────────────────────────────────────────────────
  setRenderStats: (s: Partial<RenderStats>) => void;

  // ── Console ───────────────────────────────────────────────────────────────
  logMessage: (level: 'info' | 'warn' | 'error', text: string, tick?: number) => void;
  clearConsole: () => void;

  // ── App navigation ───────────────────────────────────────────────────────
  setAppMode: (mode: AppMode) => void;
  setArchPage: (page: ArchPage) => void;
  setArchInspectorValue: (val: string | null) => void;

  // ── Architecture ↔ Simulator integration ─────────────────────────────────
  sendBitsToCircuit: (bits: (0 | 1)[], label?: string) => void;
  importGeneratedCircuit: (components: CircuitComponent[], wires: Wire[]) => void;
}

const PROBE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const DEFAULT_SIMULATION: SimulationState = {
  mode: 'paused', speed: 'normal', tick: 0, isRunning: false,
  propagationDelay: 1, detectedHazards: [], detectedOscillations: [],
};

const DEFAULT_VIEWPORT: ViewportState = {
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  width: 1920, height: 1080,
  showGrid: true, gridSize: 20, snapToGrid: true,
};

const DEFAULT_EDITOR: EditorState = {
  currentTool: 'select', currentComponentType: null, hoveredEntityId: null,
  clipboard: null, undoStack: [], redoStack: [], zoom: 1, activeBottomTab: null,
};

const DEFAULT_SELECTION: SelectionState = {
  selectedEntityIds: new Set(), selectedWireIds: new Set(),
  isDragging: false, dragStart: null, dragCurrent: null, selectionBox: null,
};

function createDefaultProject(): Project {
  const circuitId = nanoid();
  return {
    id: nanoid(),
    name: 'Untitled Project',
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    circuits: [{
      id: circuitId,
      name: 'Main',
      components: [],
      wires: [],
      customComponents: [],
      simulationState: DEFAULT_SIMULATION,
      isMain: true,
    }],
    libraries: [],
    settings: {
      gridSize: 20, snapToGrid: true, showGrid: true,
      theme: 'dark', language: 'en',
      autosaveInterval: 60, propagationDelay: 1, wireStyle: 'orthogonal',
    },
  };
}

function getCurrentCircuit(state: AppState): Circuit | null {
  if (!state.project || !state.currentCircuitId) return null;
  return state.project.circuits.find(c => c.id === state.currentCircuitId) ?? null;
}

function updateWiresForComponents(components: CircuitComponent[], wires: Wire[], gridSize: number): Wire[] {
  const obstacles = components.map(c => getComponentWorldBounds(c));
  return wires.map(w => {
    let fromPos: { x: number; y: number } | null = null;
    let toPos: { x: number; y: number } | null = null;
    for (const comp of components) {
      const pFrom = comp.pins.find(p => p.id === w.fromPinId);
      if (pFrom) fromPos = getPinWorldPosition(comp, pFrom);
      const pTo = comp.pins.find(p => p.id === w.toPinId);
      if (pTo) toPos = getPinWorldPosition(comp, pTo);
    }
    if (fromPos && toPos) {
      return {
        ...w,
        segments: routeWire(
          fromPos,
          toPos,
          w.routingMode ?? 'horizontal-first',
          gridSize,
          w.waypoints ?? [],
          obstacles,
        ),
      };
    }
    return w;
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  // navigation
  appMode: 'welcome',
  archPage: 'dashboard',
  archInspectorValue: null,

  project: null,
  currentCircuitId: null,
  circuitVersion: 0,
  editor: DEFAULT_EDITOR,
  viewport: DEFAULT_VIEWPORT,
  simulation: DEFAULT_SIMULATION,
  selection: DEFAULT_SELECTION,
  probes: [],
  theme: 'dark',
  language: 'en',
  renderStats: { fps: 0, componentCount: 0, wireCount: 0, drawCalls: 0, lastFrameTime: 0 },
  consoleMessages: [],
  historyPast: [],
  historyFuture: [],

  // ── Project ──────────────────────────────────────────────────────────────
  setProject: (p) => set({ project: p, currentCircuitId: p.circuits.find(c => c.isMain)?.id ?? p.circuits[0]?.id ?? null }),
  setCurrentCircuit: (id) => set({ currentCircuitId: id, selection: DEFAULT_SELECTION }),

  addCircuit: (name) => {
    const newId = nanoid();
    set(s => {
      if (!s.project) return s;
      const newCircuit: Circuit = {
        id: newId,
        name: name.trim() || `Circuit ${s.project.circuits.length + 1}`,
        components: [],
        wires: [],
        customComponents: [],
        simulationState: DEFAULT_SIMULATION,
        isMain: false,
      };
      return {
        project: {
          ...s.project,
          circuits: [...s.project.circuits, newCircuit],
          modifiedAt: Date.now(),
        },
        currentCircuitId: newId,
        selection: DEFAULT_SELECTION,
      };
    });
    return newId;
  },

  removeCircuit: (id) => set(s => {
    if (!s.project || s.project.circuits.length <= 1) return s;
    const target = s.project.circuits.find(c => c.id === id);
    if (target?.isMain) return s; // Do not delete main circuit
    const remaining = s.project.circuits.filter(c => c.id !== id);
    const nextCurrent = s.currentCircuitId === id ? (remaining[0]?.id ?? null) : s.currentCircuitId;
    return {
      project: { ...s.project, circuits: remaining, modifiedAt: Date.now() },
      currentCircuitId: nextCurrent,
      selection: DEFAULT_SELECTION,
    };
  }),

  renameCircuit: (id, name) => set(s => {
    if (!s.project || !name.trim()) return s;
    const circuits = s.project.circuits.map(c => c.id === id ? { ...c, name: name.trim() } : c);
    return { project: { ...s.project, circuits, modifiedAt: Date.now() } };
  }),

  createSubcircuitInstance: (subcircuitId, x, y) => {
    const s = get();
    if (!s.project || !s.currentCircuitId || s.currentCircuitId === subcircuitId) return;
    const childCircuit = s.project.circuits.find(c => c.id === subcircuitId);
    if (!childCircuit) return;
    const subComp = createComponent('SUBCIRCUIT', x, y, { subcircuitId, name: childCircuit.name }, childCircuit);
    s.addComponent(subComp);
  },

  newProject: () => {
    const p = createDefaultProject();
    set({ project: p, currentCircuitId: p.circuits[0].id, editor: DEFAULT_EDITOR, selection: DEFAULT_SELECTION, simulation: DEFAULT_SIMULATION, probes: [], consoleMessages: [] });
  },

  loadProjectFile: (project, probes = [], viewport = DEFAULT_VIEWPORT) => set({
    project,
    currentCircuitId: project.circuits.find(circuit => circuit.isMain)?.id ?? project.circuits[0]?.id ?? null,
    probes,
    viewport,
    simulation: DEFAULT_SIMULATION,
    editor: DEFAULT_EDITOR,
    selection: DEFAULT_SELECTION,
    consoleMessages: [],
  }),

  // ── Editor ───────────────────────────────────────────────────────────────
  setTool: (tool) => set(s => ({ editor: { ...s.editor, currentTool: tool } })),
  setActiveBottomTab: (tab) => set(s => ({ editor: { ...s.editor, activeBottomTab: tab } })),

  // ── Components & Wires ───────────────────────────────────────────────────
  addComponent: (c) => set(s => {
    if (!s.project) return s;
    const circuits = s.project.circuits.map(circ =>
      circ.id === s.currentCircuitId ? { ...circ, components: [...circ.components, c] } : circ
    );
    return { project: { ...s.project, circuits, modifiedAt: Date.now() }, circuitVersion: s.circuitVersion + 1, historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100), historyFuture: [] };
  }),

  removeComponent: (id) => set(s => {
    if (!s.project) return s;
    const circuits = s.project.circuits.map(circ =>
      circ.id === s.currentCircuitId
        ? (() => {
          const component = circ.components.find(c => c.id === id);
          const pinIds = new Set(component?.pins.map(pin => pin.id) ?? []);
          return {
            ...circ,
            components: circ.components.filter(c => c.id !== id),
            wires: circ.wires.filter(w => !pinIds.has(w.fromPinId) && !pinIds.has(w.toPinId)),
          };
        })()
        : circ
    );
    const selectedEntityIds = new Set(s.selection.selectedEntityIds);
    selectedEntityIds.delete(id);
    return { project: { ...s.project, circuits, modifiedAt: Date.now() }, circuitVersion: s.circuitVersion + 1, selection: { ...s.selection, selectedEntityIds }, historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100), historyFuture: [] };
  }),

  rotateComponent: (id, angleDelta = 90) => set(s => {
    if (!s.project) return s;
    const gridSize = s.viewport.gridSize;
    const circuits = s.project.circuits.map(circ => {
      if (circ.id !== s.currentCircuitId) return circ;
      const updatedComponents = circ.components.map(c => {
        if (c.id !== id) return c;
        const currentRot = c.transform.rotation ?? 0;
        const nextRot = ((currentRot + angleDelta) % 360 + 360) % 360;
        return { ...c, transform: { ...c.transform, rotation: nextRot } };
      });
      const updatedWires = updateWiresForComponents(updatedComponents, circ.wires, gridSize);
      return { ...circ, components: updatedComponents, wires: updatedWires };
    });
    return { project: { ...s.project, circuits, modifiedAt: Date.now() }, historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100), historyFuture: [] };
  }),

  rotateSelectedComponents: (angleDelta = 90) => set(s => {
    if (!s.project || s.selection.selectedEntityIds.size === 0) return s;
    const gridSize = s.viewport.gridSize;
    const selectedSet = s.selection.selectedEntityIds;
    const circuits = s.project.circuits.map(circ => {
      if (circ.id !== s.currentCircuitId) return circ;
      const updatedComponents = circ.components.map(c => {
        if (!selectedSet.has(c.id)) return c;
        const currentRot = c.transform.rotation ?? 0;
        const nextRot = ((currentRot + angleDelta) % 360 + 360) % 360;
        return { ...c, transform: { ...c.transform, rotation: nextRot } };
      });
      const updatedWires = updateWiresForComponents(updatedComponents, circ.wires, gridSize);
      return { ...circ, components: updatedComponents, wires: updatedWires };
    });
    return { project: { ...s.project, circuits, modifiedAt: Date.now() }, historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100), historyFuture: [] };
  }),

  updateComponentProperty: (id, key, value) => set(s => {
    if (!s.project) return s;
    const gridSize = s.viewport.gridSize;
    const circuits = s.project.circuits.map(circ => {
      if (circ.id !== s.currentCircuitId) return circ;
      const target = circ.components.find(component => component.id === id);
      if (!target) return circ;

      const updatedProps = { ...target.properties, [key]: value as PropertyValue };
      const pins = createPins(target.type, updatedProps);

      const oldPinMap = new Map(target.pins.map(p => [p.name, p]));
      const nextPins = pins.map(newPin => {
        const existing = oldPinMap.get(newPin.name);
        return existing ? { ...newPin, id: existing.id, currentValue: existing.currentValue } : newPin;
      });

      const updatedComponents = circ.components.map(c => c.id === id ? { ...c, properties: updatedProps, pins: nextPins } : c);

      // Build the complete set of ALL valid pin IDs across the entire circuit
      // (not just the updated component's pins — wires connect pins from DIFFERENT components)
      const allPinIds = new Set(updatedComponents.flatMap(c => c.pins.map(p => p.id)));

      // Only remove wires whose endpoints reference pins that no longer exist anywhere
      const filteredWires = circ.wires.filter(w => allPinIds.has(w.fromPinId) && allPinIds.has(w.toPinId));
      const updatedWires = updateWiresForComponents(updatedComponents, filteredWires, gridSize);

      return {
        ...circ,
        components: updatedComponents,
        wires: updatedWires,
      };
    });
    return { project: { ...s.project, circuits, modifiedAt: Date.now() }, historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100), historyFuture: [] };
  }),

  updateComponentLabel: (id, label) => set(s => {
    if (!s.project) return s;
    const circuits = s.project.circuits.map(circuit => circuit.id === s.currentCircuitId
      ? { ...circuit, components: circuit.components.map(component => component.id === id ? { ...component, label } : component) }
      : circuit);
    return { project: { ...s.project, circuits, modifiedAt: Date.now() }, historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100), historyFuture: [] };
  }),

  moveComponent: (id, x, y) => set(s => {
    if (!s.project) return s;
    const gridSize = s.viewport.gridSize;
    const nextX = s.viewport.snapToGrid ? Math.round(x / gridSize) * gridSize : x;
    const nextY = s.viewport.snapToGrid ? Math.round(y / gridSize) * gridSize : y;

    const circuits = s.project.circuits.map(circuit => {
      if (circuit.id !== s.currentCircuitId) return circuit;
      const updatedComponents = circuit.components.map(c => c.id === id ? { ...c, transform: { ...c.transform, x: nextX, y: nextY } } : c);
      const updatedWires = updateWiresForComponents(updatedComponents, circuit.wires, gridSize);
      return { ...circuit, components: updatedComponents, wires: updatedWires };
    });
    return { project: { ...s.project, circuits, modifiedAt: Date.now() } };
  }),

  moveSelectedComponents: (dx, dy) => set(s => {
    if (!s.project || s.selection.selectedEntityIds.size === 0) return s;
    const gridSize = s.viewport.gridSize;
    const selectedSet = s.selection.selectedEntityIds;

    const circuits = s.project.circuits.map(circuit => {
      if (circuit.id !== s.currentCircuitId) return circuit;
      const updatedComponents = circuit.components.map(c => {
        if (!selectedSet.has(c.id)) return c;
        const newX = c.transform.x + dx;
        const newY = c.transform.y + dy;
        const snappedX = s.viewport.snapToGrid ? Math.round(newX / gridSize) * gridSize : newX;
        const snappedY = s.viewport.snapToGrid ? Math.round(newY / gridSize) * gridSize : newY;
        return { ...c, transform: { ...c.transform, x: snappedX, y: snappedY } };
      });
      const updatedWires = updateWiresForComponents(updatedComponents, circuit.wires, gridSize);
      return { ...circuit, components: updatedComponents, wires: updatedWires };
    });
    return { project: { ...s.project, circuits, modifiedAt: Date.now() } };
  }),

  /**
   * commitDrag — called ONCE on pointerup after a drag.
   * Applies final snapped positions for all dragged components,
   * reroutes ONLY the wires connected to moved components, and records ONE undo entry.
   * Zero Zustand calls happen during the drag itself.
   */
  commitDrag: (origins, dx, dy, gridSize) => set(s => {
    if (!s.project) return s;
    const movedIds = new Set(origins.keys());
    const circuits = s.project.circuits.map(circuit => {
      if (circuit.id !== s.currentCircuitId) return circuit;
      const updatedComponents = circuit.components.map(c => {
        if (!origins.has(c.id)) return c;
        const origin = origins.get(c.id)!;
        const snappedX = Math.round((origin.x + dx) / gridSize) * gridSize;
        const snappedY = Math.round((origin.y + dy) / gridSize) * gridSize;
        return { ...c, transform: { ...c.transform, x: snappedX, y: snappedY } };
      });
      // Only reroute wires whose pins belong to moved components
      const movedPinIds = new Set(
        circuit.components.filter(c => movedIds.has(c.id)).flatMap(c => c.pins.map(p => p.id))
      );
      const affectedWires = circuit.wires.filter(w => movedPinIds.has(w.fromPinId) || movedPinIds.has(w.toPinId));
      const unaffectedWires = circuit.wires.filter(w => !movedPinIds.has(w.fromPinId) && !movedPinIds.has(w.toPinId));
      const reroutedWires = updateWiresForComponents(updatedComponents, affectedWires, gridSize);
      return { ...circuit, components: updatedComponents, wires: [...unaffectedWires, ...reroutedWires] };
    });
    return {
      project: { ...s.project, circuits, modifiedAt: Date.now() },
      circuitVersion: s.circuitVersion + 1,
      historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100),
      historyFuture: [],
    };
  }),

  addWire: (w) => set(s => {
    if (!s.project) return s;
    const circuit = getCurrentCircuit(s);
    if (!circuit) return s;
    const pins = circuit.components.flatMap(component => component.pins);
    const from = pins.find(pin => pin.id === w.fromPinId);
    const to = pins.find(pin => pin.id === w.toPinId);
    if (!from || !to || from.id === to.id || !(from.direction === 'output' || from.direction === 'bidirectional') || !(to.direction === 'input' || to.direction === 'bidirectional') || circuit.wires.some(existing => existing.fromPinId === w.fromPinId && existing.toPinId === w.toPinId)) return s;
    const circuits = s.project.circuits.map(circ =>
      circ.id === s.currentCircuitId ? { ...circ, wires: [...circ.wires, w] } : circ
    );
    return { project: { ...s.project, circuits, modifiedAt: Date.now() }, circuitVersion: s.circuitVersion + 1, historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100), historyFuture: [] };
  }),

  removeWire: (id) => set(s => {
    if (!s.project) return s;
    const circuits = s.project.circuits.map(circ =>
      circ.id === s.currentCircuitId ? { ...circ, wires: circ.wires.filter(w => w.id !== id) } : circ
    );
    return { project: { ...s.project, circuits, modifiedAt: Date.now() }, circuitVersion: s.circuitVersion + 1, historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100), historyFuture: [] };
  }),

  updateWireWaypoints: (wireId, waypoints, routingMode) => set(s => {
    if (!s.project) return s;
    const circuit = getCurrentCircuit(s);
    if (!circuit) return s;
    const gridSize = s.viewport.gridSize;
    const obstacles = circuit.components.map(c => getComponentWorldBounds(c));

    const circuits = s.project.circuits.map(circ => {
      if (circ.id !== s.currentCircuitId) return circ;
      const updatedWires = circ.wires.map(w => {
        if (w.id !== wireId) return w;
        let fromPos: { x: number; y: number } | null = null;
        let toPos: { x: number; y: number } | null = null;
        for (const comp of circ.components) {
          const pFrom = comp.pins.find(p => p.id === w.fromPinId);
          if (pFrom) fromPos = getPinWorldPosition(comp, pFrom);
          const pTo = comp.pins.find(p => p.id === w.toPinId);
          if (pTo) toPos = getPinWorldPosition(comp, pTo);
        }
        const mode = routingMode ?? w.routingMode ?? 'orthogonal';
        const segments = (fromPos && toPos)
          ? routeWire(fromPos, toPos, mode, gridSize, waypoints, obstacles)
          : w.segments;
        return { ...w, waypoints, routingMode: mode, segments };
      });
      return { ...circ, wires: updatedWires };
    });
    return { project: { ...s.project, circuits, modifiedAt: Date.now() }, historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100), historyFuture: [] };
  }),

  addWireJunction: (wireId, junction) => set(s => {
    if (!s.project) return s;
    const circuits = s.project.circuits.map(circ => {
      if (circ.id !== s.currentCircuitId) return circ;
      const updatedWires = circ.wires.map(w => {
        if (w.id !== wireId) return w;
        const exists = w.junctions.some(j => j.x === junction.x && j.y === junction.y);
        return exists ? w : { ...w, junctions: [...w.junctions, junction] };
      });
      return { ...circ, wires: updatedWires };
    });
    return { project: { ...s.project, circuits, modifiedAt: Date.now() } };
  }),

  rerouteWires: () => set(s => {
    if (!s.project) return s;
    const gridSize = s.viewport.gridSize;
    const circuits = s.project.circuits.map(circuit => {
      if (circuit.id !== s.currentCircuitId) return circuit;
      return { ...circuit, wires: updateWiresForComponents(circuit.components, circuit.wires, gridSize) };
    });
    return { project: { ...s.project, circuits } };
  }),

  // ── Selection ────────────────────────────────────────────────────────────
  selectComponent: (id, addToSelection = false) => set(s => {
    const ids = addToSelection ? new Set(s.selection.selectedEntityIds) : new Set<string>();
    ids.add(id);
    return { selection: { ...s.selection, selectedEntityIds: ids } };
  }),

  selectWire: (id, addToSelection = false) => set(s => {
    const ids = addToSelection ? new Set(s.selection.selectedWireIds) : new Set<string>();
    ids.add(id);
    return { selection: { ...s.selection, selectedWireIds: ids } };
  }),

  selectInBox: (box, addToSelection = false) => set(s => {
    const circuit = getCurrentCircuit(s);
    if (!circuit) return s;
    const selectedEntityIds = addToSelection ? new Set(s.selection.selectedEntityIds) : new Set<string>();

    const boxX = Math.min(box.x, box.x + box.width);
    const boxY = Math.min(box.y, box.y + box.height);
    const boxW = Math.abs(box.width);
    const boxH = Math.abs(box.height);

    circuit.components.forEach(c => {
      const bounds = getComponentWorldBounds(c);
      if (
        bounds.x < boxX + boxW &&
        bounds.x + bounds.width > boxX &&
        bounds.y < boxY + boxH &&
        bounds.y + bounds.height > boxY
      ) {
        selectedEntityIds.add(c.id);
      }
    });

    return { selection: { ...s.selection, selectedEntityIds } };
  }),

  clearSelection: () => set({
    selection: { ...DEFAULT_SELECTION, selectedEntityIds: new Set(), selectedWireIds: new Set() },
  }),

  setSelectionBox: (box) => set(s => ({ selection: { ...s.selection, selectionBox: box } })),

  deleteSelected: () => set(s => {
    if (!s.project) return s;
    const selectedComps = s.selection.selectedEntityIds;
    const selectedWires = s.selection.selectedWireIds;
    if (selectedComps.size === 0 && selectedWires.size === 0) return s;

    const circuits = s.project.circuits.map(circ => {
      if (circ.id !== s.currentCircuitId) return circ;
      const removedPins = new Set(circ.components.filter(c => selectedComps.has(c.id)).flatMap(c => c.pins.map(p => p.id)));
      return {
        ...circ,
        components: circ.components.filter(c => !selectedComps.has(c.id)),
        wires: circ.wires.filter(w => !selectedWires.has(w.id) && !removedPins.has(w.fromPinId) && !removedPins.has(w.toPinId)),
      };
    });

    return {
      project: { ...s.project, circuits, modifiedAt: Date.now() },
      circuitVersion: s.circuitVersion + 1,
      selection: DEFAULT_SELECTION,
      historyPast: [...s.historyPast, getCurrentCircuit(s)!].slice(-100),
      historyFuture: [],
    };
  }),

  // ── Clipboard ────────────────────────────────────────────────────────────
  copySelected: () => {
    const s = get();
    const circuit = getCurrentCircuit(s);
    if (!circuit) return;
    const components = circuit.components.filter(c => s.selection.selectedEntityIds.has(c.id));
    const pinIds = new Set(components.flatMap(component => component.pins.map(pin => pin.id)));
    const wires = circuit.wires.filter(wire => pinIds.has(wire.fromPinId) && pinIds.has(wire.toPinId));
    set(st => ({ editor: { ...st.editor, clipboard: { components, wires } } }));
  },

  cutSelected: () => {
    const s = get();
    s.copySelected();
    s.deleteSelected();
  },

  paste: () => {
    const s = get();
    if (!s.editor.clipboard) return;
    const pinIdMap = new Map<string, string>();
    const newComponentIds: string[] = [];

    const pasted = s.editor.clipboard.components.map(component => {
      const id = nanoid();
      newComponentIds.push(id);
      return {
        ...component,
        id,
        pins: component.pins.map(pin => {
          const pinId = nanoid();
          pinIdMap.set(pin.id, pinId);
          return { ...pin, id: pinId, connectedWireIds: [] };
        }),
        transform: { ...component.transform, x: component.transform.x + 40, y: component.transform.y + 40 },
      };
    });

    pasted.forEach(c => get().addComponent(c));

    s.editor.clipboard.wires.forEach(wire => {
      const fromPinId = pinIdMap.get(wire.fromPinId);
      const toPinId = pinIdMap.get(wire.toPinId);
      if (fromPinId && toPinId) get().addWire({ ...wire, id: nanoid(), fromPinId, toPinId });
    });

    // Select pasted components
    const newSel = new Set(newComponentIds);
    set(st => ({ selection: { ...st.selection, selectedEntityIds: newSel } }));
  },

  duplicateSelected: () => {
    const s = get();
    s.copySelected();
    s.paste();
  },

  // ── Undo/Redo ────────────────────────────────────────────────────────────
  undo: () => set(s => {
    const previous = s.historyPast.at(-1);
    const current = getCurrentCircuit(s);
    if (!previous || !current || !s.project) return s;
    return {
      project: { ...s.project, circuits: s.project.circuits.map(circuit => circuit.id === current.id ? previous : circuit), modifiedAt: Date.now() },
      historyPast: s.historyPast.slice(0, -1),
      historyFuture: [current, ...s.historyFuture].slice(0, 100),
    };
  }),

  redo: () => set(s => {
    const next = s.historyFuture[0];
    const current = getCurrentCircuit(s);
    if (!next || !current || !s.project) return s;
    return {
      project: { ...s.project, circuits: s.project.circuits.map(circuit => circuit.id === current.id ? next : circuit), modifiedAt: Date.now() },
      historyPast: [...s.historyPast, current].slice(-100),
      historyFuture: s.historyFuture.slice(1),
    };
  }),

  // ── Viewport ─────────────────────────────────────────────────────────────
  setViewport: (v) => set(s => ({ viewport: { ...s.viewport, ...v } })),
  setZoom: (zoom) => set(s => ({ viewport: { ...s.viewport, transform: { ...s.viewport.transform, scale: zoom } }, editor: { ...s.editor, zoom } })),

  // ── Simulation ───────────────────────────────────────────────────────────
  setSimulationState: (sim) => set(s => ({ simulation: { ...s.simulation, ...sim } })),
  applySimulationSnapshot: (snapshot) => set(s => {
    if (!s.project) return s;
    const pins = new Map(snapshot.pinValues);
    const wires = new Map(snapshot.wireValues);
    const circuits = s.project.circuits.map(circuit => circuit.id !== s.currentCircuitId ? circuit : {
      ...circuit,
      components: circuit.components.map(component => ({ ...component, pins: component.pins.map(pin => ({ ...pin, currentValue: pins.get(pin.id) ?? pin.currentValue })) })),
      wires: circuit.wires.map(wire => ({ ...wire, currentValue: wires.get(wire.id) ?? wire.currentValue })),
    });
    return {
      project: { ...s.project, circuits },
      simulation: { ...snapshot.state, detectedHazards: snapshot.hazards, detectedOscillations: snapshot.oscillations },
      probes: s.probes.map(probe => {
        const value = pins.get(probe.pinId);
        return value === undefined ? probe : { ...probe, history: [...probe.history.slice(-499), value] };
      }),
    };
  }),
  addHazard: (h) => set(s => ({ simulation: { ...s.simulation, detectedHazards: [...s.simulation.detectedHazards.slice(-99), h] } })),

  // ── Probes ───────────────────────────────────────────────────────────────
  addProbe: (pinId, label) => set(s => ({
    probes: [...s.probes, { id: nanoid(), pinId, label, color: PROBE_COLORS[s.probes.length % PROBE_COLORS.length], history: [] }],
  })),

  removeProbe: (id) => set(s => ({ probes: s.probes.filter(p => p.id !== id) })),

  updateProbeHistory: (pinId, value) => set(s => ({
    probes: s.probes.map(p => p.pinId === pinId ? { ...p, history: [...p.history.slice(-499), value] } : p),
  })),

  // ── Theme & Language ──────────────────────────────────────────────────────
  setTheme: (theme) => set({ theme }),
  setLanguage: (lang) => { setLanguage(lang); set({ language: lang }); },

  // ── Render stats ──────────────────────────────────────────────────────────
  setRenderStats: (s) => set(st => ({ renderStats: { ...st.renderStats, ...s } })),

  // ── Console ───────────────────────────────────────────────────────────────
  logMessage: (level, text, tick = 0) => set(s => ({
    consoleMessages: [...s.consoleMessages.slice(-499), { level, text, tick }],
  })),
  clearConsole: () => set({ consoleMessages: [] }),

  // ── App navigation ───────────────────────────────────────────────────────
  setAppMode: (mode) => set({ appMode: mode }),
  setArchPage: (page) => set({ archPage: page }),
  setArchInspectorValue: (val) => set({ archInspectorValue: val }),

  // ── Architecture → Simulator: place CONSTANT bits in current circuit ──────
  sendBitsToCircuit: (bits, label = 'Value') => {
    const s = get();
    if (!s.project || !s.currentCircuitId) return;
    const circuit = s.project.circuits.find(c => c.id === s.currentCircuitId);
    if (!circuit) return;

    // Place each bit as a CONSTANT component, aligned to grid from viewport center
    const gs = s.viewport.gridSize ?? 20;
    const cx = Math.round((s.viewport.width / 2) / gs) * gs;
    const cy = Math.round((s.viewport.height / 2) / gs) * gs;
    const spacing = gs * 4;

    // Import dynamically to avoid circular deps at module load time
    // We use dynamic import inside the action
    import('@core/components/factory').then(({ createComponent }) => {
      const newComponents: import('@apptypes/core').CircuitComponent[] = [];
      bits.forEach((bit, idx) => {
        const compType = bit === 1 ? 'CONSTANT_1' : 'CONSTANT_0';
        const x = cx + (idx - Math.floor(bits.length / 2)) * spacing;
        const y = cy + gs * 4;
        const comp = createComponent(compType, x, y, {
          value: bit,
          label: `${label}[${bits.length - 1 - idx}]`,
        });
        newComponents.push(comp);
      });

      set(st => {
        if (!st.project || !st.currentCircuitId) return st;
        const circuits = st.project.circuits.map(c => {
          if (c.id !== st.currentCircuitId) return c;
          return { ...c, components: [...c.components, ...newComponents] };
        });
        return {
          appMode: 'simulator' as AppMode,
          project: { ...st.project, circuits, modifiedAt: Date.now() },
          selection: {
            ...st.selection,
            selectedEntityIds: new Set(newComponents.map(c => c.id)),
            selectedWireIds: new Set(),
          },
        };
      });
    }).catch(console.error);
  },

  // ── Import real synthesized circuit directly onto Logisim canvas ───────────
  importGeneratedCircuit: (newComponents, newWires) => {
    const s = get();
    if (!s.project || !s.currentCircuitId) return;
    const currentCircuit = getCurrentCircuit(s);
    if (!currentCircuit) return;

    // Calculate grid aligned offset to place neatly without overlapping if canvas already has components
    const gs = s.viewport.gridSize ?? 20;
    const offsetX = 0;
    let offsetY = 0;

    if (currentCircuit.components.length > 0) {
      const maxExistingY = Math.max(...currentCircuit.components.map(c => c.transform.y + c.bounds.height));
      offsetY = Math.round((maxExistingY + 80) / gs) * gs;
    }

    const positionedComponents = newComponents.map(c => ({
      ...c,
      transform: {
        ...c.transform,
        x: c.transform.x + offsetX,
        y: c.transform.y + offsetY,
      },
    }));

    const positionedWires = newWires.map(w => ({
      ...w,
      segments: w.segments.map(seg => ({
        from: { x: seg.from.x + offsetX, y: seg.from.y + offsetY },
        to: { x: seg.to.x + offsetX, y: seg.to.y + offsetY },
      })),
    }));

    set(st => {
      if (!st.project || !st.currentCircuitId) return st;
      const circuits = st.project.circuits.map(c => {
        if (c.id !== st.currentCircuitId) return c;
        return {
          ...c,
          components: [...c.components, ...positionedComponents],
          wires: [...c.wires, ...positionedWires],
        };
      });

      return {
        appMode: 'simulator' as AppMode,
        project: { ...st.project, circuits, modifiedAt: Date.now() },
        historyPast: [...st.historyPast, currentCircuit].slice(-100),
        historyFuture: [],
        selection: {
          ...st.selection,
          selectedEntityIds: new Set(positionedComponents.map(c => c.id)),
          selectedWireIds: new Set(positionedWires.map(w => w.id)),
        },
      };
    });
  },
}));

// Initialize with a default project on load
useAppStore.getState().newProject();
