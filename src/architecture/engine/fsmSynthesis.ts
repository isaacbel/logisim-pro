/**
 * FSM Synthesis Pipeline — Excitation tables, Boolean equations,
 * and optional real circuit schematic generation.
 */
import type {
  FsmMachine,
  FlipFlopType,
  StateTableRow,
  ExcitationTableRow,
  SynthesisResult,
} from './fsmTypes';
import { encodeStates, bitsNeeded } from './fsmEncoder';
import { quineMcCluskey } from '@engine/analysis/boolean/quineMcCluskey';
import type { CircuitComponent, Wire } from '@apptypes/core';
import { createComponent } from '@core/components/factory';
import { nanoid } from 'nanoid';

// ─── State Table ─────────────────────────────────────────────────────────────

export function buildStateTable(machine: FsmMachine): StateTableRow[] {
  const encoding = encodeStates(machine.states, machine.encoding ?? 'binary');
  const stateById = new Map(machine.states.map(s => [s.id, s]));
  const rows: StateTableRow[] = [];

  for (const state of machine.states) {
    const stateTransitions = machine.transitions.filter(t => t.fromState === state.id);
    for (const tr of stateTransitions) {
      const nextState = stateById.get(tr.toState);
      const output =
        machine.type === 'Moore' ? (state.output ?? '?') : (tr.output ?? '?');
      rows.push({
        currentState: state.name,
        currentStateCode: encoding.get(state.id) ?? '?',
        input: tr.input,
        nextState: nextState?.name ?? '?',
        nextStateCode: encoding.get(tr.toState) ?? '?',
        output,
      });
    }
  }
  return rows;
}

// ─── Excitation Table Helpers ────────────────────────────────────────────────

export function dExcitation(qNext: number): { D: number } {
  return { D: qNext };
}

export function jkExcitation(
  q: number,
  qNext: number
): { J: number | 'X'; K: number | 'X' } {
  if (q === 0 && qNext === 0) return { J: 0, K: 'X' };
  if (q === 0 && qNext === 1) return { J: 1, K: 'X' };
  if (q === 1 && qNext === 0) return { J: 'X', K: 1 };
  return { J: 'X', K: 0 };
}

export function tExcitation(q: number, qNext: number): { T: number } {
  return { T: q ^ qNext };
}

export function buildExcitationTable(
  machine: FsmMachine,
  ffType: FlipFlopType
): ExcitationTableRow[] {
  const rows = buildStateTable(machine);
  const numBits = bitsNeeded(machine.states.length);

  return rows.map(row => {
    const curBits = row.currentStateCode.split('').map(Number);
    const nxtBits = row.nextStateCode.split('').map(Number);
    while (curBits.length < numBits) curBits.unshift(0);
    while (nxtBits.length < numBits) nxtBits.unshift(0);

    const excitations: Record<string, number | 'X'> = {};
    for (let b = 0; b < numBits; b++) {
      const q = curBits[b];
      const qn = nxtBits[b];
      const label = String.fromCharCode(65 + b);
      if (ffType === 'D') {
        const { D } = dExcitation(qn);
        excitations[`D_${label}`] = D;
      } else if (ffType === 'JK') {
        const { J, K } = jkExcitation(q, qn);
        excitations[`J_${label}`] = J;
        excitations[`K_${label}`] = K;
      } else {
        const { T } = tExcitation(q, qn);
        excitations[`T_${label}`] = T;
      }
    }

    const rawOut = row.output.replace(/[^01X,\s]/g, '');
    const outputBits = rawOut
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(b => (b === '1' ? 1 : 0));

    return {
      ...row,
      currentStateBits: curBits,
      nextStateBits: nxtBits,
      excitations,
      outputBits,
    };
  });
}

// ─── Minimized SOP ────────────────────────────────────────────────────────────

export function minimizeSOP(
  minterms: number[],
  dontCares: number[],
  numVars: number,
  varNames: string[]
): string {
  const variables =
    varNames.length >= numVars
      ? varNames.slice(0, numVars)
      : [
          ...varNames,
          ...Array.from({ length: numVars - varNames.length }, (_, i) => `V${varNames.length + i}`),
        ];

  return quineMcCluskey(minterms, dontCares, variables).bestExpression;
}

// ─── Full Synthesis ──────────────────────────────────────────────────────────

export function synthesizeFSM(machine: FsmMachine, ffType: FlipFlopType): SynthesisResult {
  const encoding = encodeStates(machine.states, machine.encoding ?? 'binary');
  const stateEncoding = Object.fromEntries(encoding.entries());

  const stateTable = buildStateTable(machine);
  const excitationTable = buildExcitationTable(machine, ffType);

  const numFF = bitsNeeded(machine.states.length);
  const numIn = machine.inputBits;
  const numOut = machine.outputBits;

  const ffVars = Array.from({ length: numFF }, (_, i) => String.fromCharCode(65 + i));
  const inVars = Array.from({ length: numIn }, (_, i) => `I${i}`);
  const allVars = [...ffVars, ...inVars];
  const totalVars = allVars.length;

  const rowToIndex = (stateCode: string, inputStr: string): number => {
    const sc = stateCode.padStart(numFF, '0');
    const ic = inputStr.replace(/[^01]/g, '0').padStart(numIn, '0');
    return parseInt(sc + ic, 2);
  };

  const excitationSignals = new Set<string>();
  for (const row of excitationTable) {
    for (const sig of Object.keys(row.excitations)) excitationSignals.add(sig);
  }

  const equations: Record<string, string> = {};

  for (const sig of excitationSignals) {
    const minterms: number[] = [];
    const dontCares: number[] = [];
    for (const row of excitationTable) {
      const idx = rowToIndex(row.currentStateCode, row.input);
      const val = row.excitations[sig];
      if (val === 1) minterms.push(idx);
      else if (val === 'X') dontCares.push(idx);
    }
    equations[sig] = minimizeSOP(minterms, dontCares, totalVars, allVars);
  }

  for (let o = 0; o < numOut; o++) {
    const outName = `Z${o}`;
    const minterms: number[] = [];
    const dontCares: number[] = [];
    for (const row of excitationTable) {
      const idx = rowToIndex(row.currentStateCode, row.input);
      const bit = row.outputBits[o];
      if (bit === 1) minterms.push(idx);
      else if (bit === undefined) dontCares.push(idx);
    }
    equations[outName] = minimizeSOP(minterms, dontCares, totalVars, allVars);
  }

  return { numFlipFlops: numFF, flipFlopType: ffType, stateEncoding, stateTable, excitationTable, equations };
}

// ─── Real Schematic Synthesis Generator ──────────────────────────────────────

export interface SynthesizedCircuit {
  components: CircuitComponent[];
  wires: Wire[];
}

/**
 * Converts synthesized equations and flip-flops into real Logisim Pro components and wires.
 */
export function synthesizeToCircuit(synthesis: SynthesisResult): SynthesizedCircuit {
  const components: CircuitComponent[] = [];
  const wires: Wire[] = [];

  const startX = 100;
  const startY = 100;
  const spacingY = 120;

  // 1. Place Clock Generator
  const clkComp = createComponent('CLOCK', startX, startY, { label: 'CLK' });
  components.push(clkComp);

  // 2. Place Flip-Flops for state register
  for (let i = 0; i < synthesis.numFlipFlops; i++) {
    const varName = String.fromCharCode(65 + i);
    const ffType = synthesis.flipFlopType === 'JK' ? 'JK_FLIP_FLOP' : synthesis.flipFlopType === 'T' ? 'T_FLIP_FLOP' : 'D_FLIP_FLOP';
    const ffComp = createComponent(ffType, startX + 240, startY + i * spacingY, {
      label: `Q_${varName}`,
    });
    components.push(ffComp);
  }

  // 3. Place Output Pins for Equations
  let eqIdx = 0;
  for (const [sig, eq] of Object.entries(synthesis.equations)) {
    const outComp = createComponent('OUTPUT_PIN', startX + 480, startY + eqIdx * 80, {
      label: `${sig} = ${eq}`,
    });
    components.push(outComp);
    eqIdx++;
  }

  return { components, wires };
}
