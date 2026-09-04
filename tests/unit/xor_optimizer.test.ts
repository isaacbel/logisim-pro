import { describe, it, expect } from 'vitest';
import { detectXorStructure, expandXorPairToAndOrNot, expandXorToAndOrNot } from '@engine/analysis/boolean/xorOptimizer';
import { checkBooleanEquivalence } from '@engine/analysis/validation/booleanEquivalence';

describe('XOR / Parity Optimizer', () => {
  it('should detect 2-variable XOR structure (A ⊕ B)', () => {
    // Minterms: 1, 2
    const res = detectXorStructure([1, 2], ['A', 'B']);
    expect(res.hasXorStructure).toBe(true);
    expect(res.xorExpression).toBe('A ⊕ B');
    expect(res.isXorCheaper).toBe(true);
  });

  it('should detect 3-variable XOR parity function (A ⊕ B ⊕ C)', () => {
    // Odd parity of 3 variables: m1, m2, m4, m7
    const res = detectXorStructure([1, 2, 4, 7], ['A', 'B', 'C']);
    expect(res.hasXorStructure).toBe(true);
    expect(res.xorExpression).toBe('A ⊕ B ⊕ C');
    expect(res.isXorCheaper).toBe(true);
  });

  it('should expand XOR pairs to equivalent AND/OR/NOT', () => {
    const expanded = expandXorPairToAndOrNot('A', 'B');
    const eq = checkBooleanEquivalence('A ^ B', expanded);
    expect(eq.isEquivalent).toBe(true);
  });
});
