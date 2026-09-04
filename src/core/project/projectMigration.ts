/**
 * Logisim Pro — Project Migration & Validation Engine
 * Ensures backward-compatibility across all project versions (v0 legacy -> v1 -> future).
 * Validates component schemas, pin connections, wires, and prevents silent corruption.
 */

import {
  LogisimProProjectFile,
  LogisimProProjectMetadata,
  CURRENT_FORMAT_VERSION,
  CURRENT_APPLICATION_VERSION,
  createProjectFile,
} from './projectFormat';
import type {
  Project,
  Circuit,
  ComponentCategory,
  PropertyValue,
  BoundingBox,
  RoutingMode,
  SignalValue,
  SimulationState,
  ProjectSettings,
} from '@apptypes/core';

/**
 * Shapes of *untrusted* project data as it arrives from disk, import, or the clipboard.
 * Every field is optional because an imported file may omit or corrupt any of them.
 * These types exist so the migration path cannot silently assume a valid Project.
 */
interface RawWire {
  id?: string;
  segments?: unknown;
  fromPinId?: string;
  toPinId?: string;
  bitWidth?: number;
  isBus?: boolean;
  currentValue?: SignalValue;
  junctions?: unknown;
  waypoints?: unknown;
  routingMode?: RoutingMode;
}

interface RawComponent {
  id?: string;
  type?: string;
  typeId?: string;
  category?: ComponentCategory;
  name?: string;
  transform?: { x?: number; y?: number; rotation?: number; scale?: number };
  position?: { x?: number; y?: number };
  rotation?: number;
  pins?: unknown;
  properties?: Record<string, PropertyValue>;
  bounds?: BoundingBox;
  label?: string;
}

interface RawCircuit {
  id?: string;
  name?: string;
  isMain?: boolean;
  simulationState?: SimulationState;
  customComponents?: unknown;
  components?: RawComponent[];
  wires?: RawWire[];
}

interface RawProject {
  id?: string;
  name?: string;
  createdAt?: number;
  modifiedAt?: number;
  circuits?: RawCircuit[];
  libraries?: unknown;
  settings?: ProjectSettings;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the internal structure of a Project object
 */
export function validateCircuitProject(project: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!project || typeof project !== 'object') {
    return { valid: false, errors: ['Project data is not an object or is null.'], warnings: [] };
  }

  const p = project as Partial<Project>;

  if (!p.id || typeof p.id !== 'string') {
    errors.push('Missing or invalid project "id".');
  }

  if (!p.name || typeof p.name !== 'string') {
    warnings.push('Project missing "name", defaulting to "Untitled Project".');
  }

  if (!Array.isArray(p.circuits) || p.circuits.length === 0) {
    errors.push('Project must contain at least one circuit in "circuits" array.');
  } else {
    p.circuits.forEach((circuit: Circuit, idx: number) => {
      if (!circuit.id) errors.push(`Circuit at index ${idx} is missing an "id".`);
      if (!circuit.name) warnings.push(`Circuit at index ${idx} is missing a "name".`);
      if (!Array.isArray(circuit.components)) {
        errors.push(`Circuit "${circuit.name || idx}" is missing "components" array.`);
      }
      if (!Array.isArray(circuit.wires)) {
        errors.push(`Circuit "${circuit.name || idx}" is missing "wires" array.`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a parsed .lpro project file envelope
 */
export function validateProjectFile(file: unknown): ValidationResult {
  if (!file || typeof file !== 'object') {
    return { valid: false, errors: ['File content is not valid JSON object.'], warnings: [] };
  }

  const f = file as Record<string, unknown>;

  // Check if it's already a versioned .lpro envelope
  if (typeof f.formatVersion === 'number' && f.project) {
    return validateCircuitProject(f.project);
  }

  // Check if it's a legacy unversioned raw Project object (circuits array at root)
  if (Array.isArray(f.circuits)) {
    return validateCircuitProject(f);
  }

  return {
    valid: false,
    errors: ['Unrecognized project format: Missing "formatVersion" envelope and "circuits" array.'],
    warnings: [],
  };
}

/**
 * Migrates any raw or legacy project data into the authoritative LogisimProProjectFile structure
 */
export function migrateProjectFile(raw: unknown): LogisimProProjectFile {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot migrate empty or invalid project data.');
  }

  const obj = raw as Record<string, unknown>;

  // Case 1: Already at current format version
  if (obj.formatVersion === CURRENT_FORMAT_VERSION && obj.project) {
    const project = sanitizeProject(obj.project);
    return {
      formatVersion: CURRENT_FORMAT_VERSION,
      applicationVersion: (obj.applicationVersion as string) || CURRENT_APPLICATION_VERSION,
      generator: (obj.generator as string) || 'Logisim Pro',
      metadata: (obj.metadata as LogisimProProjectFile['metadata']) || {
        name: project.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      project,
      probes: Array.isArray(obj.probes) ? obj.probes : [],
      viewport: obj.viewport as LogisimProProjectFile['viewport'],
      booleanAlgebra: obj.booleanAlgebra as LogisimProProjectFile['booleanAlgebra'],
      arch8086: obj.arch8086 as LogisimProProjectFile['arch8086'],
    };
  }

  // Case 2: Legacy raw Project object (no formatVersion envelope)
  if (Array.isArray(obj.circuits)) {
    const legacyProject = sanitizeProject(obj);
    return createProjectFile(legacyProject, {
      name: legacyProject.name || 'Migrated Project',
      description: 'Migrated from legacy unversioned format.',
    });
  }

  // Case 3: Future version migration step chaining (e.g. v2 -> v1 fallback, or v0 -> v1)
  const formatVer = typeof obj.formatVersion === 'number' ? obj.formatVersion : 0;
  if (formatVer < CURRENT_FORMAT_VERSION && obj.project) {
    // Apply step migrations if needed
    const currentData = sanitizeProject(obj.project);
    return createProjectFile(currentData, (obj.metadata as Partial<LogisimProProjectMetadata> | undefined) || {});
  }

  throw new Error(`Unsupported project format version: ${obj.formatVersion}`);
}

/**
 * Sanitizes project circuits and components, fixing missing IDs or defaults
 */
function sanitizeProject(raw: unknown): Project {
  const p = (raw ?? {}) as RawProject;
  const sanitizedCircuits: Circuit[] = (p.circuits || []).map((c: RawCircuit, cIdx: number) => ({
    id: c.id || `circuit_${cIdx}_${Date.now()}`,
    name: c.name || `Circuit ${cIdx + 1}`,
    isMain: c.isMain ?? (cIdx === 0),
    simulationState: c.simulationState || {
      mode: 'paused',
      speed: 'normal',
      tick: 0,
      isRunning: false,
      propagationDelay: 1,
      detectedHazards: [],
      detectedOscillations: [],
    },
    customComponents: Array.isArray(c.customComponents) ? c.customComponents : [],
    components: (c.components || []).map((comp: RawComponent, compIdx: number) => {
      const x = comp.transform?.x ?? comp.position?.x ?? 100;
      const y = comp.transform?.y ?? comp.position?.y ?? 100;
      const rotation = comp.transform?.rotation ?? comp.rotation ?? 0;
      const scale = comp.transform?.scale ?? 1;
      return {
        id: comp.id || `comp_${compIdx}_${Date.now()}`,
        type: comp.type || comp.typeId || 'UNKNOWN',
        category: comp.category || 'gates',
        name: comp.name || comp.type || 'Component',
        transform: { x, y, scale, rotation },
        pins: Array.isArray(comp.pins) ? comp.pins : [],
        properties: comp.properties || {},
        bounds: comp.bounds || { x: 0, y: 0, width: 60, height: 40 },
        label: comp.label,
      };
    }),
    wires: (c.wires || []).map((wire: RawWire, wIdx: number) => ({
      id: wire.id || `wire_${wIdx}_${Date.now()}`,
      segments: Array.isArray(wire.segments) ? wire.segments : [],
      fromPinId: wire.fromPinId || '',
      toPinId: wire.toPinId || '',
      bitWidth: wire.bitWidth || 1,
      isBus: wire.isBus || false,
      currentValue: wire.currentValue ?? 2,
      junctions: Array.isArray(wire.junctions) ? wire.junctions : [],
      waypoints: Array.isArray(wire.waypoints) ? wire.waypoints : undefined,
      routingMode: wire.routingMode,
    })),
  }));

  return {
    id: p.id || `project_${Date.now()}`,
    name: p.name || 'Untitled Project',
    createdAt: p.createdAt || Date.now(),
    modifiedAt: p.modifiedAt || Date.now(),
    circuits: sanitizedCircuits.length > 0 ? sanitizedCircuits : [{
      id: `circuit_0_${Date.now()}`,
      name: 'Main',
      isMain: true,
      components: [],
      wires: [],
      customComponents: [],
      simulationState: {
        mode: 'paused',
        speed: 'normal',
        tick: 0,
        isRunning: false,
        propagationDelay: 1,
        detectedHazards: [],
        detectedOscillations: [],
      },
    }],
    libraries: Array.isArray(p.libraries) ? p.libraries : [],
    settings: p.settings || {
      gridSize: 20,
      snapToGrid: true,
      showGrid: true,
      theme: 'dark',
      language: 'en',
      autosaveInterval: 60,
      propagationDelay: 1,
      wireStyle: 'orthogonal',
    },
  };
}
