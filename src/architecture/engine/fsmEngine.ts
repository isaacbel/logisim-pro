/**
 * FSM Engine — Unified entry point for Finite State Machine modeling,
 * validation, simulation, minimization, and synthesis.
 *
 * Fully modular architecture re-exporting pure specialized sub-modules.
 */
import { nanoid } from 'nanoid';
import type { FsmMachine, FsmType } from './fsmTypes';

export * from './fsmTypes';
export * from './fsmEncoder';
export * from './fsmEvaluator';
export * from './fsmValidator';
export * from './fsmMinimizer';
export * from './fsmSynthesis';

// ─── Blank machine factory ────────────────────────────────────────────────────

export function createBlankMachine(type: FsmType = 'Moore'): FsmMachine {
  return {
    id: nanoid(),
    name: 'New FSM',
    type,
    states: [],
    transitions: [],
    inputBits: 1,
    outputBits: 1,
    encoding: 'binary',
  };
}
