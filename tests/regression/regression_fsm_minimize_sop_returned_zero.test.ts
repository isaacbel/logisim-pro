/**
 * REGRESSION — FSM synthesis produced `0` for every equation.
 *
 * Bug: `minimizeSOP` in src/architecture/engine/fsmEngine.ts carried a duplicate,
 * hand-rolled prime-implicant minimizer. Its essential-prime-implicant branch assigned
 * `best` without assigning `bestScore`, so the immediately following guard
 * `if (!best || bestScore <= 0) break` threw the implicant away and left the cover empty.
 * That branch fires first for nearly every real Boolean function, so `minimizeSOP` returned
 * the string `'0'` for all non-trivial inputs, and the FSM Designer displayed
 * `D_A = 0`, `T_A = 0`, `Z0 = 0` for a correct, fully-specified machine.
 *
 * Fix: delegate to the project's existing, test-covered Quine-McCluskey engine
 * (src/engine/analysis/boolean/quineMcCluskey.ts) instead of keeping a second minimizer.
 *
 * These assertions are deliberately written against *known-correct textbook answers*, not
 * against whatever the implementation currently emits.
 */
import { describe, it, expect } from 'vitest';
import {
  minimizeSOP,
  synthesizeFSM,
  buildStateTable,
  buildExcitationTable,
  bitsNeeded,
  jkExcitation,
  tExcitation,
  type FsmMachine,
} from '@/architecture/engine/fsmEngine';

/** S0 --0--> S0, S0 --1--> S1, S1 --0--> S1, S1 --1--> S0. Moore outputs S0=0, S1=1. */
function toggleMachine(): FsmMachine {
  return {
    id: 'm',
    name: 'Toggle',
    type: 'Moore',
    inputBits: 1,
    outputBits: 1,
    states: [
      { id: 's0', name: 'S0', output: '0', x: 0, y: 0, isInitial: true },
      { id: 's1', name: 'S1', output: '1', x: 100, y: 0, isInitial: false },
    ],
    transitions: [
      { id: 't1', fromState: 's0', toState: 's0', input: '0' },
      { id: 't2', fromState: 's0', toState: 's1', input: '1' },
      { id: 't3', fromState: 's1', toState: 's1', input: '0' },
      { id: 't4', fromState: 's1', toState: 's0', input: '1' },
    ],
  };
}

describe('regression: minimizeSOP must not return "0" for satisfiable functions', () => {
  it('returns the single minterm, not "0", when one prime implicant is essential', () => {
    // m1 over (A,B) is A'B. The old code returned "0" here.
    expect(minimizeSOP([1], [], 2, ['A', 'B'])).toBe("A'B");
    expect(minimizeSOP([0], [], 2, ['A', 'B'])).toBe("A'B'");
    expect(minimizeSOP([3], [], 2, ['A', 'B'])).toBe('AB');
  });

  it('minimizes a 2-variable XOR to two terms', () => {
    expect(minimizeSOP([1, 2], [], 2, ['A', 'B'])).toBe("A'B + AB'");
  });

  it('combines two adjacent minterms into a single literal', () => {
    expect(minimizeSOP([0, 1], [], 2, ['A', 'B'])).toBe("A'");
  });

  it('keeps two non-adjacent 3-variable corners as separate product terms', () => {
    expect(minimizeSOP([0, 7], [], 3, ['A', 'B', 'C'])).toBe("A'B'C' + ABC");
  });

  it('still handles the degenerate always-0 and always-1 functions', () => {
    expect(minimizeSOP([], [], 2, ['A', 'B'])).toBe('0');
    expect(minimizeSOP([0, 1, 2, 3], [], 2, ['A', 'B'])).toBe('1');
  });

  it('uses don\'t-cares to widen an implicant', () => {
    // m1 with m3 as don't-care collapses A'B + (AB) -> B
    expect(minimizeSOP([1], [3], 2, ['A', 'B'])).toBe('B');
  });

  it('never returns "0" for any single-minterm function up to 4 variables', () => {
    const names = ['A', 'B', 'C', 'D'];
    for (let vars = 1; vars <= 4; vars++) {
      for (let m = 0; m < 1 << vars; m++) {
        const result = minimizeSOP([m], [], vars, names.slice(0, vars));
        expect(result, `vars=${vars} minterm=${m}`).not.toBe('0');
        expect(result.length, `vars=${vars} minterm=${m}`).toBeGreaterThan(0);
      }
    }
  });

  it('pads variable names when fewer are supplied than numVars', () => {
    // Must not crash or silently produce an undefined-laden term.
    const result = minimizeSOP([1], [], 2, ['A']);
    expect(result).not.toContain('undefined');
    expect(result).not.toBe('0');
  });
});

describe('regression: synthesizeFSM emits correct equations for a toggle machine', () => {
  it('builds the correct state table (this part was always correct — protect it)', () => {
    const rows = buildStateTable(toggleMachine());
    expect(rows).toHaveLength(4);
    expect(rows.map(r => `${r.currentStateCode}/${r.input}->${r.nextStateCode}`)).toEqual([
      '0/0->0',
      '0/1->1',
      '1/0->1',
      '1/1->0',
    ]);
    expect(rows.map(r => r.output)).toEqual(['0', '0', '1', '1']);
  });

  it('needs exactly one flip-flop for two states', () => {
    expect(bitsNeeded(2)).toBe(1);
    expect(synthesizeFSM(toggleMachine(), 'D').numFlipFlops).toBe(1);
  });

  it('D flip-flop excitation is the XOR of state and input', () => {
    const { equations } = synthesizeFSM(toggleMachine(), 'D');
    // D_A = A XOR I0
    expect(equations.D_A).toBe("A'I0 + AI0'");
    expect(equations.D_A).not.toBe('0');
  });

  it('T flip-flop excitation reduces to the input alone', () => {
    const { equations } = synthesizeFSM(toggleMachine(), 'T');
    expect(equations.T_A).toBe('I0');
  });

  it('Moore output equals the state bit', () => {
    const { equations } = synthesizeFSM(toggleMachine(), 'D');
    expect(equations.Z0).toBe('A');
  });

  it('JK excitation table matches the textbook JK transition rules', () => {
    // Protect the excitation helpers, which were already correct.
    expect(jkExcitation(0, 0)).toEqual({ J: 0, K: 'X' });
    expect(jkExcitation(0, 1)).toEqual({ J: 1, K: 'X' });
    expect(jkExcitation(1, 0)).toEqual({ J: 'X', K: 1 });
    expect(jkExcitation(1, 1)).toEqual({ J: 'X', K: 0 });
    expect(tExcitation(0, 1)).toEqual({ T: 1 });
    expect(tExcitation(1, 1)).toEqual({ T: 0 });

    const rows = buildExcitationTable(toggleMachine(), 'JK');
    expect(rows).toHaveLength(4);
    // 0->0 gives J=0,K=X ; 0->1 gives J=1,K=X ; 1->1 gives J=X,K=0 ; 1->0 gives J=X,K=1
    expect(rows.map(r => r.excitations.J_A)).toEqual([0, 1, 'X', 'X']);
    expect(rows.map(r => r.excitations.K_A)).toEqual(['X', 'X', 0, 1]);
  });

  it('no synthesized equation for a fully-specified machine is the constant 0', () => {
    for (const ff of ['D', 'JK', 'T'] as const) {
      const { equations } = synthesizeFSM(toggleMachine(), ff);
      expect(Object.keys(equations).length).toBeGreaterThan(0);
      // Z0 = A and at least one excitation must be non-zero for a machine that changes state.
      expect(equations.Z0).toBe('A');
      const excitations = Object.entries(equations).filter(([k]) => k !== 'Z0');
      expect(excitations.some(([, v]) => v !== '0')).toBe(true);
    }
  });
});
