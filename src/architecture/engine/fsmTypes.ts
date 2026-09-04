/**
 * FSM Types — shared interfaces for the entire FSM subsystem.
 * Pure data types only, no logic.
 */

export type FsmType = 'Moore' | 'Mealy';
export type FlipFlopType = 'D' | 'JK' | 'T';
export type StateEncoding = 'binary' | 'gray' | 'one-hot';

export interface FsmState {
  id: string;
  name: string;
  /** Moore output string, e.g. "01" */
  output?: string;
  /** Position in the visual designer canvas */
  x: number;
  y: number;
  isInitial: boolean;
  isFinal?: boolean;
}

export interface FsmTransition {
  id: string;
  fromState: string;
  toState: string;
  /** Input condition e.g. "0", "1", "AB'" */
  input: string;
  /** Mealy output (only relevant for Mealy machines) */
  output?: string;
  /** Optional priority for conflicting transitions */
  priority?: number;
}

export interface FsmMachine {
  id: string;
  name: string;
  type: FsmType;
  states: FsmState[];
  transitions: FsmTransition[];
  /** Number of input bits */
  inputBits: number;
  /** Number of output bits */
  outputBits: number;
  encoding?: StateEncoding;
}

export interface StateTableRow {
  currentState: string;
  currentStateCode: string;
  input: string;
  nextState: string;
  nextStateCode: string;
  output: string;
}

export interface ExcitationTableRow extends StateTableRow {
  currentStateBits: number[];
  nextStateBits: number[];
  excitations: Record<string, number | 'X'>;
  outputBits: number[];
}

export interface SynthesisResult {
  numFlipFlops: number;
  flipFlopType: FlipFlopType;
  stateEncoding: Record<string, string>;
  stateTable: StateTableRow[];
  excitationTable: ExcitationTableRow[];
  /** Maps signal name (e.g. "D_A", "Z0") to minimized SOP expression */
  equations: Record<string, string>;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
  id: string;
  severity: ValidationSeverity;
  message: string;
  /** ID of offending state (if applicable) */
  stateId?: string;
  /** ID of offending transition (if applicable) */
  transitionId?: string;
}

export interface FsmStepResult {
  nextStateId: string | null;
  output: string;
  matched: boolean;
  transitionId: string | null;
}

export interface MinimizationResult {
  /** Groups of equivalent state IDs */
  equivalentGroups: string[][];
  /** Minimal FSM with merged states */
  minimizedMachine: FsmMachine;
  /** Map from original state ID → merged state ID */
  stateMap: Record<string, string>;
  /** Whether the original machine is already minimal */
  isAlreadyMinimal: boolean;
}
