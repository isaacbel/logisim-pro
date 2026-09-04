/**
 * Canvas → Truth Table derivation.
 *
 * Bridges the circuit currently on the canvas to the existing engine-driven generator in
 * `./truthTable`, which executes the real SimulationEngine over every input combination.
 *
 * No simulation logic is re-implemented here. This module only decides *which* pins are the
 * stimulus and observation points, names the columns, and reports everything it could not
 * cover so a caller can disclose it instead of silently dropping it.
 */

import type { CircuitComponent, TruthTableData, Wire } from '@apptypes/core';
import { ComponentLogicRegistry, registerBuiltInLogics } from '@engine/simulation';
import { generateTruthTable } from './truthTable';

/** Component types that act as free variables: they are swept across all combinations. */
export const CANVAS_STIMULUS_TYPES: readonly string[] = ['INPUT_PIN', 'SWITCH', 'PUSH_BUTTON'];

/**
 * Fixed sources. These are deliberately NOT swept: a tied constant is part of the circuit, not
 * an input to it, so forcing it would produce rows the built circuit cannot actually reach.
 * They are reported instead, so the caller can say they were held.
 */
export const CANVAS_CONSTANT_TYPES: readonly string[] = ['CONSTANT', 'CONSTANT_0', 'CONSTANT_1'];

/** Component types read as observed outputs. */
export const CANVAS_OUTPUT_TYPES: readonly string[] = ['OUTPUT_PIN', 'LED', 'PROBE'];

/** 6 stimulus inputs = 64 rows. Matches the cap used by the Truth Table panel. */
export const MAX_TRUTH_TABLE_INPUTS = 6;

export type CanvasTruthTableFailure =
  | 'empty-circuit'
  | 'no-inputs'
  | 'no-outputs'
  | 'no-drivable-inputs'
  | 'no-observable-outputs';

export interface CanvasTruthTableDerivation {
  /** Produced by the real SimulationEngine, one row per input combination. */
  readonly table: TruthTableData;
  readonly inputNames: string[];
  readonly outputNames: string[];
  readonly rowCount: number;
  /**
   * Stimulus components beyond `MAX_TRUTH_TABLE_INPUTS`. These are not swept, so they keep
   * whatever value they currently hold on the canvas and the table is a slice of the full
   * function rather than all of it.
   */
  readonly unsweptInputNames: string[];
  /** Constant sources held at their built value (see `CANVAS_CONSTANT_TYPES`). */
  readonly heldConstantNames: string[];
  /** Input/output components that expose no usable pin, so they could not participate. */
  readonly unusableComponentNames: string[];
}

export type CanvasTruthTableOutcome =
  | { readonly ok: true; readonly derivation: CanvasTruthTableDerivation }
  | { readonly ok: false; readonly reason: CanvasTruthTableFailure; readonly message: string };

/**
 * Column label for a component: its user label, else a stable type+index fallback.
 *
 * `createComponent` defaults `label` to the component's own type, so a label equal to the type
 * means "not labelled by the user" and gets the indexed form instead — otherwise every unlabelled
 * input would collide on the same column name.
 */
function columnBaseName(comp: CircuitComponent, index: number): string {
  const label = comp.label?.trim();
  return label && label.length > 0 && label !== comp.type ? label : `${comp.type}_${index}`;
}

/**
 * Truth-table rows are keyed by column name, so two components sharing a label would collapse
 * into one column and silently lose a signal. Suffix duplicates instead.
 */
function uniqueColumnName(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}#${n}`)) n++;
  const name = `${base}#${n}`;
  used.add(name);
  return name;
}

/** The pin an input component drives the circuit through. */
function drivePinId(comp: CircuitComponent): string | null {
  const pin = comp.pins.find(p => p.direction === 'output' || p.direction === 'bidirectional');
  return pin ? pin.id : null;
}

/** The pin an output component observes the circuit through. */
function observePinId(comp: CircuitComponent): string | null {
  const pin = comp.pins.find(p => p.direction === 'input' || p.direction === 'bidirectional');
  return pin ? pin.id : null;
}

/**
 * Derives the truth table of the circuit as it is actually built, by running the real
 * simulation engine over every combination of its stimulus inputs.
 */
export function deriveCanvasTruthTable(
  components: CircuitComponent[] | undefined,
  wires: Wire[] | undefined,
): CanvasTruthTableOutcome {
  if (!components || components.length === 0) {
    return {
      ok: false,
      reason: 'empty-circuit',
      message: 'The canvas is empty. Build a circuit before exporting a truth table.',
    };
  }

  const stimulus = components.filter(c => CANVAS_STIMULUS_TYPES.includes(c.type));
  const constants = components.filter(c => CANVAS_CONSTANT_TYPES.includes(c.type));
  const outputs = components.filter(c => CANVAS_OUTPUT_TYPES.includes(c.type));

  const used = new Set<string>();
  const heldConstantNames = constants.map((c, i) => uniqueColumnName(columnBaseName(c, i), used));

  if (stimulus.length === 0) {
    const held = heldConstantNames.length > 0
      ? ` (${heldConstantNames.length} constant source${heldConstantNames.length === 1 ? '' : 's'} found, but constants are held at their fixed value rather than swept)`
      : '';
    return {
      ok: false,
      reason: 'no-inputs',
      message: `No Input Pin, Switch or Push Button found to sweep${held}.`,
    };
  }

  if (outputs.length === 0) {
    return {
      ok: false,
      reason: 'no-outputs',
      message: 'No Output Pin, LED or Probe found to observe. Add one to record a result column.',
    };
  }

  const unusableComponentNames: string[] = [];

  const swept = stimulus.slice(0, MAX_TRUTH_TABLE_INPUTS);
  const unsweptInputNames = stimulus
    .slice(MAX_TRUTH_TABLE_INPUTS)
    .map((c, i) => uniqueColumnName(columnBaseName(c, MAX_TRUTH_TABLE_INPUTS + i), used));

  const inputPinIds: string[] = [];
  const inputNames: string[] = [];
  swept.forEach((comp, i) => {
    const pinId = drivePinId(comp);
    const name = uniqueColumnName(columnBaseName(comp, i), used);
    if (!pinId) {
      unusableComponentNames.push(name);
      return;
    }
    inputPinIds.push(pinId);
    inputNames.push(name);
  });

  const outputPinIds: string[] = [];
  const outputNames: string[] = [];
  outputs.forEach((comp, i) => {
    const pinId = observePinId(comp);
    const name = uniqueColumnName(columnBaseName(comp, i), used);
    if (!pinId) {
      unusableComponentNames.push(name);
      return;
    }
    outputPinIds.push(pinId);
    outputNames.push(name);
  });

  if (inputPinIds.length === 0) {
    return {
      ok: false,
      reason: 'no-drivable-inputs',
      message: 'The input components on the canvas expose no output pin to drive, so no combination can be applied.',
    };
  }

  if (outputPinIds.length === 0) {
    return {
      ok: false,
      reason: 'no-observable-outputs',
      message: 'The output components on the canvas expose no input pin to read, so no result can be recorded.',
    };
  }

  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  const table = generateTruthTable(
    inputPinIds,
    outputPinIds,
    inputNames,
    outputNames,
    registry,
    components,
    wires ?? [],
  );

  return {
    ok: true,
    derivation: {
      table,
      inputNames,
      outputNames,
      rowCount: table.rows.length,
      unsweptInputNames,
      heldConstantNames,
      unusableComponentNames,
    },
  };
}

/**
 * One-line description of what a derivation actually covers, including everything it left out.
 * Kept here so the disclosure wording cannot drift between callers.
 */
export function summarizeCanvasTruthTable(d: CanvasTruthTableDerivation): string {
  const parts = [
    `${d.inputNames.length} input${d.inputNames.length === 1 ? '' : 's'}`,
    `${d.outputNames.length} output${d.outputNames.length === 1 ? '' : 's'}`,
    `${d.rowCount} rows`,
  ];

  if (d.unsweptInputNames.length > 0) {
    parts.push(
      `${d.unsweptInputNames.length} input${d.unsweptInputNames.length === 1 ? '' : 's'} not swept (${d.unsweptInputNames.join(', ')}) — limit is ${MAX_TRUTH_TABLE_INPUTS}`,
    );
  }
  if (d.heldConstantNames.length > 0) {
    parts.push(`${d.heldConstantNames.length} constant source${d.heldConstantNames.length === 1 ? '' : 's'} held fixed (${d.heldConstantNames.join(', ')})`);
  }
  if (d.unusableComponentNames.length > 0) {
    parts.push(`${d.unusableComponentNames.length} component${d.unusableComponentNames.length === 1 ? '' : 's'} skipped for lack of a usable pin (${d.unusableComponentNames.join(', ')})`);
  }

  return parts.join(' · ');
}
