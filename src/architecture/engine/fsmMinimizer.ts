/**
 * FSM State Minimizer — Partition Refinement (Myhill-Nerode / Hopcroft equivalence).
 *
 * Mathematically minimizes Moore and Mealy finite state machines by finding
 * k-equivalent state equivalence classes and merging indistinguishable states.
 *
 * Pure functional algorithm — never mutates the original machine.
 */
import type { FsmMachine, FsmState, FsmTransition, MinimizationResult } from './fsmTypes';
import { nanoid } from 'nanoid';

export function minimizeFSM(machine: FsmMachine): MinimizationResult {
  if (machine.states.length <= 1) {
    return {
      equivalentGroups: machine.states.map(s => [s.id]),
      minimizedMachine: JSON.parse(JSON.stringify(machine)),
      stateMap: Object.fromEntries(machine.states.map(s => [s.id, s.id])),
      isAlreadyMinimal: true,
    };
  }

  // 1. Gather all possible input conditions observed across the machine
  const allInputs = Array.from(new Set(machine.transitions.map(t => t.input.trim()))).sort();
  if (allInputs.length === 0) {
    allInputs.push('0', '1');
  }

  // Helper to find next state and output for state s and input i
  const getNext = (stateId: string, input: string): { nextStateId: string | null; output: string } => {
    const tr = machine.transitions.find(t => t.fromState === stateId && t.input.trim() === input);
    if (!tr) {
      return { nextStateId: null, output: '?' };
    }
    const output = machine.type === 'Mealy' ? (tr.output ?? '?') : (machine.states.find(s => s.id === stateId)?.output ?? '?');
    return { nextStateId: tr.toState, output };
  };

  // 2. Initial Partition P0
  // For Moore: group states by their state output
  // For Mealy: group states by their output vector across all inputs
  let partition: string[][] = [];

  if (machine.type === 'Moore') {
    const groupsByOutput = new Map<string, string[]>();
    for (const state of machine.states) {
      const out = state.output ?? '0';
      const grp = groupsByOutput.get(out) ?? [];
      grp.push(state.id);
      groupsByOutput.set(out, grp);
    }
    partition = Array.from(groupsByOutput.values());
  } else {
    // Mealy
    const groupsByOutputVector = new Map<string, string[]>();
    for (const state of machine.states) {
      const outVector = allInputs.map(inp => getNext(state.id, inp).output).join('|');
      const grp = groupsByOutputVector.get(outVector) ?? [];
      grp.push(state.id);
      groupsByOutputVector.set(outVector, grp);
    }
    partition = Array.from(groupsByOutputVector.values());
  }

  // 3. Iterative Refinement
  let changed = true;
  while (changed) {
    changed = false;
    const newPartition: string[][] = [];

    // Map each state ID to its current partition group index
    const stateToGroupIndex = new Map<string, number>();
    partition.forEach((group, idx) => {
      group.forEach(stateId => stateToGroupIndex.set(stateId, idx));
    });

    for (const group of partition) {
      if (group.length <= 1) {
        newPartition.push(group);
        continue;
      }

      // Sub-divide the group based on destination group signatures
      const subGroups = new Map<string, string[]>();

      for (const stateId of group) {
        // Signature is list of (destination group index, and for Mealy output) for each input
        const signatureParts: string[] = [];
        for (const inp of allInputs) {
          const { nextStateId, output } = getNext(stateId, inp);
          const destGroup = nextStateId ? (stateToGroupIndex.get(nextStateId) ?? -1) : -1;
          signatureParts.push(`${destGroup}:${output}`);
        }
        const sig = signatureParts.join(',');
        const existing = subGroups.get(sig) ?? [];
        existing.push(stateId);
        subGroups.set(sig, existing);
      }

      const split = Array.from(subGroups.values());
      if (split.length > 1) {
        changed = true;
      }
      for (const s of split) {
        newPartition.push(s);
      }
    }

    partition = newPartition;
  }

  // 4. Check if already minimal
  const isAlreadyMinimal = partition.length === machine.states.length;
  const equivalentGroups = partition.filter(g => g.length > 1);

  // 5. Construct Minimized Machine
  const stateById = new Map(machine.states.map(s => [s.id, s]));
  const stateMap: Record<string, string> = {}; // oldId -> newId

  const newStates: FsmState[] = partition.map((group, idx) => {
    const isInitial = group.some(id => stateById.get(id)?.isInitial);
    const isFinal = group.some(id => stateById.get(id)?.isFinal);
    const representative = stateById.get(group[0])!;
    const name = group.length === 1
      ? representative.name
      : group.map(id => stateById.get(id)?.name ?? id).join('_');
    const newId = group.length === 1 ? representative.id : nanoid();

    // Map all old IDs to the new representative ID
    group.forEach(id => {
      stateMap[id] = newId;
    });

    return {
      id: newId,
      name,
      output: representative.output,
      x: representative.x,
      y: representative.y,
      isInitial,
      isFinal,
    };
  });

  // Construct new transitions without duplicates
  const newTransitions: FsmTransition[] = [];
  const seenTransitionKeys = new Set<string>();

  for (const tr of machine.transitions) {
    const fromMapped = stateMap[tr.fromState];
    const toMapped = stateMap[tr.toState];
    if (!fromMapped || !toMapped) continue;

    const key = `${fromMapped}->${toMapped}|${tr.input}|${tr.output ?? ''}`;
    if (!seenTransitionKeys.has(key)) {
      seenTransitionKeys.add(key);
      newTransitions.push({
        id: nanoid(),
        fromState: fromMapped,
        toState: toMapped,
        input: tr.input,
        output: tr.output,
        priority: tr.priority,
      });
    }
  }

  const minimizedMachine: FsmMachine = {
    ...machine,
    id: nanoid(),
    name: `${machine.name} (Minimized)`,
    states: newStates,
    transitions: newTransitions,
  };

  return {
    equivalentGroups,
    minimizedMachine,
    stateMap,
    isAlreadyMinimal,
  };
}
