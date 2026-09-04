/**
 * Core type definitions for the Digital Logic Simulator
 * Strict typing following SOLID principles
 */

// ============================================================================
// SIGNALS & VALUES
// ============================================================================

export enum SignalValue {
  LOW = 0,
  HIGH = 1,
  UNKNOWN = 2,
  FLOATING = 3,
  ERROR = 4,
}

export type BitVector = SignalValue[];

export interface Signal {
  value: SignalValue;
  strength: number;
  timestamp: number;
}

// ============================================================================
// GEOMETRY
// ============================================================================

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Transform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
}

// ============================================================================
// ENTITY COMPONENT SYSTEM (ECS)
// ============================================================================

export type EntityId = string;
export type ComponentType = string;

export interface Component {
  readonly type: ComponentType;
  readonly entityId: EntityId;
}

export interface ECSWorld {
  createEntity(): EntityId;
  destroyEntity(entityId: EntityId): void;
  addComponent<T extends Component>(entityId: EntityId, component: T): void;
  removeComponent(entityId: EntityId, componentType: ComponentType): void;
  getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType): T | undefined;
  getEntitiesWith(...componentTypes: ComponentType[]): EntityId[];
  hasComponent(entityId: EntityId, componentType: ComponentType): boolean;
}

// ============================================================================
// CIRCUIT COMPONENTS
// ============================================================================

export type PinDirection = 'input' | 'output' | 'bidirectional';
export type PinShape = 'line' | 'dot' | 'clock' | 'bus';

export interface Pin {
  readonly id: string;
  readonly name: string;
  readonly direction: PinDirection;
  readonly bitWidth: number;
  readonly position: Point2D;
  readonly shape: PinShape;
  currentValue: SignalValue;
  connectedWireIds: string[];
}

export interface CircuitComponent {
  readonly id: EntityId;
  readonly type: string;
  readonly category: ComponentCategory;
  readonly name: string;
  readonly transform: Transform;
  readonly pins: Pin[];
  readonly properties: Record<string, PropertyValue>;
  readonly bounds: BoundingBox;
  label?: string;
}

export type ComponentCategory =
  | 'gates'
  | 'inputs'
  | 'outputs'
  | 'memory'
  | 'arithmetic'
  | 'plexers'
  | 'wiring'
  | 'clock'
  | 'cpu'
  | 'custom';

export type PropertyValue = string | number | boolean | number[] | string[];

export interface PropertySchema {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'enum' | 'color';
  readonly default: PropertyValue;
  readonly min?: number;
  readonly max?: number;
  readonly options?: string[];
  readonly description: string;
}

// ============================================================================
// WIRES & ROUTING
// ============================================================================

export type WireStyle = 'orthogonal' | 'curved';
export type RoutingMode = 'orthogonal' | 'diagonal' | 'direct' | 'custom' | 'horizontal-first' | 'vertical-first' | 'z-shape';

export interface WireSegment {
  readonly from: Point2D;
  readonly to: Point2D;
}

export interface Wire {
  readonly id: string;
  readonly segments: WireSegment[];
  readonly fromPinId: string;
  readonly toPinId: string;
  readonly bitWidth: number;
  readonly isBus: boolean;
  currentValue: SignalValue;
  readonly junctions: Point2D[];
  readonly waypoints?: Point2D[];
  readonly routingMode?: RoutingMode;
}

export interface WireJunction {
  readonly id: string;
  readonly position: Point2D;
  readonly connectedWireIds: string[];
}

// ============================================================================
// SIMULATION
// ============================================================================

export type SimulationMode = 'continuous' | 'stepped' | 'paused';
export type SimulationSpeed = 'slow' | 'normal' | 'fast' | 'unlimited';

export interface SimulationState {
  mode: SimulationMode;
  speed: SimulationSpeed;
  tick: number;
  isRunning: boolean;
  propagationDelay: number;
  detectedHazards: HazardReport[];
  detectedOscillations: OscillationReport[];
}

export interface SimulationEvent {
  readonly tick: number;
  readonly targetPinId: string;
  readonly newValue: SignalValue;
  readonly sourceComponentId: string;
}

export interface HazardReport {
  readonly tick: number;
  readonly componentId: string;
  readonly description: string;
  readonly severity: 'warning' | 'error';
}

export interface OscillationReport {
  readonly tick: number;
  readonly componentIds: string[];
  readonly period: number;
}

// ============================================================================
// ANALYSIS & LOGIC TOOLS
// ============================================================================

export interface WaveformProbe {
  id: string;
  pinId: string;
  label: string;
  color: string;
  history: SignalValue[];
}

export interface TruthTableRow {
  inputs: Record<string, SignalValue>;
  outputs: Record<string, SignalValue>;
}

export interface TruthTableData {
  inputNames: string[];
  outputNames: string[];
  rows: TruthTableRow[];
}

export interface KMapGroup {
  cells: [number, number][]; // [row, col]
  color: string;
  term: string;
}

export interface KMapData {
  variables: string[];
  grid: (0 | 1 | 'X')[][];
  rowHeaders: string[];
  colHeaders: string[];
  groups: KMapGroup[];
  simplifiedExpression: string;
}

export interface BooleanAnalysisResult {
  sop: string; // Sum of Products
  pos: string; // Product of Sums
  canonicalMinterms: number[];
  canonicalMaxterms: number[];
  minimizedExpression: string;
}

// ============================================================================
// CPU BUILDER
// ============================================================================

export interface CpuRegister {
  name: string;
  value: number;
  bitWidth: number;
}

export interface CpuState {
  pc: number;
  registers: Record<string, CpuRegister>;
  ir: number;
  controlSignals: Record<string, boolean>;
  ram: number[];
  rom: number[];
  isStepping: boolean;
  executedInstructions: number;
}

// ============================================================================
// PROJECT & FILE SYSTEM
// ============================================================================

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly modifiedAt: number;
  readonly circuits: Circuit[];
  readonly libraries: ComponentLibrary[];
  readonly settings: ProjectSettings;
}

export interface Circuit {
  readonly id: string;
  readonly name: string;
  readonly components: CircuitComponent[];
  readonly wires: Wire[];
  readonly customComponents: CustomComponentDefinition[];
  readonly simulationState: SimulationState;
  readonly isMain: boolean;
}

export interface CustomComponentDefinition {
  readonly id: string;
  readonly name: string;
  readonly circuitId: string;
  readonly interfacePins: Pin[];
  readonly icon: string;
}

export interface ComponentLibrary {
  readonly id: string;
  readonly name: string;
  readonly components: string[];
  readonly isBuiltIn: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'glass';
export type AppLanguage = 'en' | 'fr' | 'ar' | 'es' | 'de' | 'ja';

export interface ProjectSettings {
  readonly gridSize: number;
  readonly snapToGrid: boolean;
  readonly showGrid: boolean;
  readonly theme: ThemeMode;
  readonly language: AppLanguage;
  readonly autosaveInterval: number;
  readonly propagationDelay: number;
  readonly wireStyle: WireStyle;
}

// ============================================================================
// CANVAS & RENDERING
// ============================================================================

export interface ViewportState {
  readonly transform: Transform;
  readonly width: number;
  readonly height: number;
  readonly showGrid: boolean;
  readonly gridSize: number;
  readonly snapToGrid: boolean;
}

export interface SelectionState {
  readonly selectedEntityIds: Set<EntityId>;
  readonly selectedWireIds: Set<string>;
  readonly isDragging: boolean;
  readonly dragStart: Point2D | null;
  readonly dragCurrent: Point2D | null;
  readonly selectionBox: BoundingBox | null;
}

export interface RenderStats {
  fps: number;
  componentCount: number;
  wireCount: number;
  drawCalls: number;
  lastFrameTime: number;
}

// ============================================================================
// EDITOR STATE
// ============================================================================

export type EditorTool =
  | 'select'
  | 'pan'
  | 'wire'
  | 'component'
  | 'text'
  | 'probe'
  | 'delete';

export interface EditorState {
  readonly currentTool: EditorTool;
  readonly currentComponentType: string | null;
  readonly hoveredEntityId: EntityId | null;
  readonly clipboard: ClipboardCircuit | null;
  readonly undoStack: EditorAction[];
  readonly redoStack: EditorAction[];
  readonly zoom: number;
  readonly activeBottomTab: 'waveform' | 'truthtable' | 'kmap' | 'cpu' | 'console' | null;
}

export interface ClipboardCircuit {
  readonly components: CircuitComponent[];
  readonly wires: Wire[];
}

export interface EditorAction {
  readonly type: 'add' | 'remove' | 'move' | 'connect' | 'property_change' | 'batch';
  readonly timestamp: number;
  readonly payload: unknown;
  readonly inverse: EditorAction;
}

// ============================================================================
// PLUGIN SYSTEM
// ============================================================================

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly entryPoint: string;
  readonly apiVersion: string;
  readonly enabled: boolean;
}

export interface PluginAPI {
  readonly registerComponent: (definition: ComponentDefinition) => void;
  readonly registerTheme: (theme: ThemeDefinition) => void;
  readonly registerExporter: (exporter: ExporterDefinition) => void;
  readonly registerImporter: (importer: ImporterDefinition) => void;
  readonly onSimulationTick: (callback: (state: SimulationState) => void) => void;
}

export interface ComponentDefinition {
  readonly type: string;
  readonly category: ComponentCategory;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly properties: PropertySchema[];
  readonly pins: Omit<Pin, 'currentValue' | 'connectedWireIds'>[];
  readonly simulate: (inputs: SignalValue[], props: Record<string, PropertyValue>) => SignalValue[];
  readonly render: (ctx: unknown, props: Record<string, PropertyValue>) => void;
}

export interface ThemeDefinition {
  readonly id: string;
  readonly name: string;
  readonly colors: Record<string, string>;
}

export interface ExporterDefinition {
  readonly id: string;
  readonly name: string;
  readonly extensions: string[];
  readonly export: (project: Project) => Promise<Blob>;
}

export interface ImporterDefinition {
  readonly id: string;
  readonly name: string;
  readonly extensions: string[];
  readonly import: (data: ArrayBuffer) => Promise<Project>;
}
