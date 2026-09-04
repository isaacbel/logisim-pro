/**
 * REGRESSION — project migration on untrusted input.
 *
 * Guards the v2.0 change that replaced four `any` casts in `projectMigration.ts` with
 * explicit `Raw*` types describing untrusted, possibly-corrupt imported data.
 *
 * The migration path must keep behaving EXACTLY as before that refactor:
 *   - malformed/partial project data is repaired with defaults, never thrown away
 *   - every wire in a legacy project survives migration (see PHASE 5: wires must not vanish)
 *   - genuinely unusable input still throws
 *
 * Baseline reference: docs/V2_BASELINE.md
 */
import { describe, it, expect } from 'vitest';
import { migrateProjectFile, validateProjectFile } from '@core/project/projectMigration';
import { CURRENT_FORMAT_VERSION } from '@core/project/projectFormat';

describe('regression: projectMigration accepts untrusted input', () => {
  it('throws on genuinely unusable input', () => {
    expect(() => migrateProjectFile(null)).toThrow(/Cannot migrate/);
    expect(() => migrateProjectFile(undefined)).toThrow(/Cannot migrate/);
    expect(() => migrateProjectFile('not an object')).toThrow(/Cannot migrate/);
    // An object with neither a formatVersion envelope nor a circuits array is unsupported.
    expect(() => migrateProjectFile({ something: 'else' })).toThrow(/Unsupported project format/);
  });

  it('migrates a legacy unversioned project (circuits at root) to the current format', () => {
    const legacy = {
      id: 'proj-legacy',
      name: 'Legacy Circuit',
      circuits: [{ id: 'c1', name: 'Main', components: [], wires: [] }],
    };

    const migrated = migrateProjectFile(legacy);

    expect(migrated.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expect(migrated.project.circuits).toHaveLength(1);
    expect(migrated.project.circuits[0].name).toBe('Main');
    expect(migrated.project.name).toBe('Legacy Circuit');
  });

  it('preserves EVERY wire when migrating — wires must never disappear', () => {
    const legacy = {
      id: 'p',
      name: 'Wired',
      circuits: [{
        id: 'c1',
        name: 'Main',
        components: [],
        wires: [
          { id: 'w1', fromPinId: 'a', toPinId: 'b' },
          { id: 'w2', fromPinId: 'c', toPinId: 'd' },
          { id: 'w3', fromPinId: 'e', toPinId: 'f' },
        ],
      }],
    };

    const wires = migrateProjectFile(legacy).project.circuits[0].wires;

    expect(wires).toHaveLength(3);
    expect(wires.map(w => w.id)).toEqual(['w1', 'w2', 'w3']);
    expect(wires.map(w => w.fromPinId)).toEqual(['a', 'c', 'e']);
    expect(wires.map(w => w.toPinId)).toEqual(['b', 'd', 'f']);
  });

  it('repairs a wire with every optional field missing instead of dropping it', () => {
    const migrated = migrateProjectFile({
      circuits: [{ components: [], wires: [{}] }],
    });

    const wire = migrated.project.circuits[0].wires[0];
    expect(migrated.project.circuits[0].wires).toHaveLength(1);
    expect(wire.id).toBeTruthy();
    expect(wire.bitWidth).toBe(1);
    expect(wire.isBus).toBe(false);
    expect(wire.currentValue).toBe(2); // SignalValue.UNKNOWN
    expect(wire.segments).toEqual([]);
    expect(wire.junctions).toEqual([]);
    expect(wire.fromPinId).toBe('');
    expect(wire.toPinId).toBe('');
  });

  it('normalizes a legacy component that uses position/rotation instead of transform', () => {
    const migrated = migrateProjectFile({
      circuits: [{
        components: [{ id: 'k1', type: 'AND', position: { x: 140, y: 260 }, rotation: 90 }],
        wires: [],
      }],
    });

    const comp = migrated.project.circuits[0].components[0];
    expect(comp.transform).toEqual({ x: 140, y: 260, scale: 1, rotation: 90 });
    expect(comp.type).toBe('AND');
    expect(comp.pins).toEqual([]);
    expect(comp.properties).toEqual({});
    expect(comp.bounds).toEqual({ x: 0, y: 0, width: 60, height: 40 });
  });

  it('prefers transform over the legacy position/rotation fields when both are present', () => {
    const migrated = migrateProjectFile({
      circuits: [{
        components: [{
          id: 'k1', type: 'OR',
          transform: { x: 10, y: 20, rotation: 180, scale: 2 },
          position: { x: 999, y: 999 }, rotation: 270,
        }],
        wires: [],
      }],
    });

    expect(migrated.project.circuits[0].components[0].transform)
      .toEqual({ x: 10, y: 20, scale: 2, rotation: 180 });
  });

  it('substitutes a default Main circuit when the circuits array is empty', () => {
    const migrated = migrateProjectFile({ circuits: [] as unknown[] });

    expect(migrated.project.circuits).toHaveLength(1);
    expect(migrated.project.circuits[0].name).toBe('Main');
    expect(migrated.project.circuits[0].isMain).toBe(true);
    expect(migrated.project.settings.gridSize).toBe(20);
  });

  it('does not execute or evaluate anything from an imported file (PHASE 35)', () => {
    // A hostile file may contain keys that look executable. Migration must treat them as inert data.
    let sideEffect = false;
    const hostile = {
      circuits: [{
        components: [{
          id: 'x', type: 'AND',
          get properties() { sideEffect = true; return {}; }, // reading is fine; executing is not
        }],
        wires: [],
      }],
      constructor: { name: 'evil' },
      __proto__: { polluted: true },
    };

    const migrated = migrateProjectFile(hostile);

    // Property access happens (it is a plain read), but nothing from the file lands on
    // Object.prototype and no code path is invoked from a string in the file.
    expect(sideEffect).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(migrated.project.circuits[0].components[0].properties).toEqual({});
  });

  it('validateProjectFile still classifies the three input shapes correctly', () => {
    expect(validateProjectFile(null).valid).toBe(false);
    expect(validateProjectFile({}).valid).toBe(false);
    expect(validateProjectFile({ circuits: [] }).valid).toBe(false); // needs >= 1 circuit
    expect(validateProjectFile({
      id: 'p', name: 'n',
      circuits: [{ id: 'c', name: 'Main', components: [], wires: [] }],
    }).valid).toBe(true);
  });
});
