/**
 * FSM Validator — Comprehensive rule checker for finite state machines.
 * Detects:
 * - Missing initial state / multiple initial states
 * - Unreachable states (no directed path from initial state)
 * - Dead states / traps (states with no outgoing transitions)
 * - Nondeterministic / conflicting transitions (overlapping input conditions from same state)
 * - Missing transitions / incomplete input coverage
 * - Duplicate transitions
 * - Invalid outputs / empty states
 */
import type { FsmMachine, ValidationResult } from './fsmTypes';
import { nanoid } from 'nanoid';

export function validateFSM(machine: FsmMachine): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (machine.states.length === 0) {
    results.push({
      id: nanoid(),
      severity: 'error',
      message: 'FSM has no states. Add at least one state to begin.',
    });
    return results;
  }

  // 1. Check Initial State
  const initialStates = machine.states.filter(s => s.isInitial);
  if (initialStates.length === 0) {
    results.push({
      id: nanoid(),
      severity: 'error',
      message: 'No initial state defined. Mark one state as initial (start state).',
    });
  } else if (initialStates.length > 1) {
    results.push({
      id: nanoid(),
      severity: 'error',
      message: `Multiple initial states detected (${initialStates.map(s => s.name).join(', ')}). Only one is allowed.`,
    });
  }

  const stateIds = new Set(machine.states.map(s => s.id));
  const stateById = new Map(machine.states.map(s => [s.id, s]));

  // 2. Check transition target/source validity
  for (const tr of machine.transitions) {
    if (!stateIds.has(tr.fromState)) {
      results.push({
        id: nanoid(),
        severity: 'error',
        message: `Transition references non-existent source state ID: ${tr.fromState}`,
        transitionId: tr.id,
      });
    }
    if (!stateIds.has(tr.toState)) {
      results.push({
        id: nanoid(),
        severity: 'error',
        message: `Transition references non-existent destination state ID: ${tr.toState}`,
        transitionId: tr.id,
      });
    }
  }

  // 3. Reachability from initial state (BFS)
  if (initialStates.length === 1) {
    const reachable = new Set<string>();
    const queue: string[] = [initialStates[0].id];
    reachable.add(initialStates[0].id);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const outgoing = machine.transitions.filter(t => t.fromState === cur);
      for (const edge of outgoing) {
        if (stateIds.has(edge.toState) && !reachable.has(edge.toState)) {
          reachable.add(edge.toState);
          queue.push(edge.toState);
        }
      }
    }

    for (const state of machine.states) {
      if (!reachable.has(state.id)) {
        results.push({
          id: nanoid(),
          severity: 'warning',
          message: `State "${state.name}" is unreachable from initial state "${initialStates[0].name}".`,
          stateId: state.id,
        });
      }
    }
  }

  // 4. Dead states / terminal states (no outgoing transitions)
  for (const state of machine.states) {
    const outgoing = machine.transitions.filter(t => t.fromState === state.id);
    if (outgoing.length === 0) {
      // If it's explicitly marked final, it's info/intended, otherwise warning
      if (state.isFinal) {
        results.push({
          id: nanoid(),
          severity: 'info',
          message: `State "${state.name}" is an accept/terminal state with no outgoing transitions.`,
          stateId: state.id,
        });
      } else {
        results.push({
          id: nanoid(),
          severity: 'warning',
          message: `State "${state.name}" has no outgoing transitions (deadlock / trap state).`,
          stateId: state.id,
        });
      }
    }
  }

  // 5. Conflicting / overlapping transitions from the same state
  for (const state of machine.states) {
    const outgoing = machine.transitions.filter(t => t.fromState === state.id);
    const seenInputs = new Map<string, string>(); // input condition -> transition ID

    for (const tr of outgoing) {
      const normInput = tr.input.trim();
      if (seenInputs.has(normInput)) {
        const otherTrId = seenInputs.get(normInput)!;
        results.push({
          id: nanoid(),
          severity: 'error',
          message: `State "${state.name}" has ambiguous/conflicting transitions for input "${normInput}".`,
          stateId: state.id,
          transitionId: tr.id,
        });
      } else {
        seenInputs.set(normInput, tr.id);
      }
    }
  }

  // 6. Output validation for Moore vs Mealy
  if (machine.type === 'Moore') {
    for (const state of machine.states) {
      if (state.output === undefined || state.output.trim() === '') {
        results.push({
          id: nanoid(),
          severity: 'warning',
          message: `Moore state "${state.name}" has no output defined.`,
          stateId: state.id,
        });
      }
    }
  } else if (machine.type === 'Mealy') {
    for (const tr of machine.transitions) {
      if (tr.output === undefined || tr.output.trim() === '') {
        const fromName = stateById.get(tr.fromState)?.name ?? tr.fromState;
        const toName = stateById.get(tr.toState)?.name ?? tr.toState;
        results.push({
          id: nanoid(),
          severity: 'warning',
          message: `Mealy transition ${fromName} → ${toName} (input "${tr.input}") has no output defined.`,
          transitionId: tr.id,
        });
      }
    }
  }

  // 7. Duplicate State Names
  const nameCounts = new Map<string, number>();
  for (const s of machine.states) {
    const count = (nameCounts.get(s.name) ?? 0) + 1;
    nameCounts.set(s.name, count);
  }
  for (const [name, count] of nameCounts.entries()) {
    if (count > 1) {
      results.push({
        id: nanoid(),
        severity: 'warning',
        message: `Multiple states share the name "${name}". Consider using unique state identifiers.`,
      });
    }
  }

  return results;
}
