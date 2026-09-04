/**
 * FSM Evaluator — step-by-step FSM simulation.
 * Pure functions, no side effects.
 */
import type { FsmMachine, FsmStepResult } from './fsmTypes';

/**
 * Evaluate one clock step of an FSM.
 *
 * Matches input string against all outgoing transitions from currentStateId.
 * Returns the next state ID, output, and which transition fired.
 *
 * For Mealy: output comes from the fired transition.
 * For Moore: output comes from the next state.
 *
 * Input matching:
 * - Single-bit: "0" or "1"
 * - Multi-bit: "01", "10", "11" (ordered MSB→LSB matching inputBits)
 * - Wildcard: "X" or "x" matches either 0 or 1 for that bit
 * - If no transition matches, returns { matched: false, nextStateId: currentStateId }
 */
export function stepFSM(
  machine: FsmMachine,
  currentStateId: string,
  input: string,
): FsmStepResult {
  const outgoing = machine.transitions.filter(t => t.fromState === currentStateId);

  // Sort by priority (lower number = higher priority)
  outgoing.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  for (const tr of outgoing) {
    if (inputMatches(tr.input, input)) {
      const nextState = machine.states.find(s => s.id === tr.toState);
      const output = machine.type === 'Moore'
        ? (nextState?.output ?? '?')
        : (tr.output ?? '?');
      return {
        nextStateId: tr.toState,
        output,
        matched: true,
        transitionId: tr.id,
      };
    }
  }

  return { nextStateId: currentStateId, output: '?', matched: false, transitionId: null };
}

/**
 * Simulate the FSM for a sequence of inputs, starting from the initial state.
 * Returns the sequence of (state, output) pairs.
 */
export interface SimulationTrace {
  stateId: string;
  stateName: string;
  input: string;
  output: string;
  transitionId: string | null;
}

export function simulateFSM(machine: FsmMachine, inputs: string[]): SimulationTrace[] {
  const initialState = machine.states.find(s => s.isInitial) ?? machine.states[0];
  if (!initialState) return [];

  const stateById = new Map(machine.states.map(s => [s.id, s]));
  let currentId = initialState.id;
  const trace: SimulationTrace[] = [];

  // Initial state record (before first input)
  const initState = stateById.get(currentId)!;
  trace.push({
    stateId: currentId,
    stateName: initState.name,
    input: '',
    output: machine.type === 'Moore' ? (initState.output ?? '?') : '?',
    transitionId: null,
  });

  for (const inp of inputs) {
    const result = stepFSM(machine, currentId, inp);
    currentId = result.nextStateId ?? currentId;
    const state = stateById.get(currentId)!;
    trace.push({
      stateId: currentId,
      stateName: state.name,
      input: inp,
      output: result.output,
      transitionId: result.transitionId,
    });
  }

  return trace;
}

/**
 * Check if a transition input condition matches a given actual input.
 * Supports: exact match ("01"), wildcard ("0X"), "0"/"1" for single bit.
 */
function inputMatches(condition: string, actual: string): boolean {
  if (condition === actual) return true;
  if (condition.length !== actual.length) {
    // Allow length-1 conditions matched against multi-bit if they're the same value
    if (condition.length === 1 && actual.length === 1) {
      return condition.toUpperCase() === actual.toUpperCase();
    }
    // Normalize: pad condition to actual's length
    if (condition.length < actual.length) {
      condition = condition.padStart(actual.length, '0');
    }
  }
  for (let i = 0; i < condition.length; i++) {
    const c = condition[i].toUpperCase();
    const a = actual[i] ?? '0';
    if (c !== 'X' && c !== a) return false;
  }
  return true;
}
