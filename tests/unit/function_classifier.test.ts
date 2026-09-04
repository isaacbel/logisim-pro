import { describe, it, expect } from 'vitest';
import { classifyBooleanFunction } from '@engine/analysis/boolean/functionClassifier';

describe('Boolean Function Classifier', () => {
  it('should detect constant 0 and constant 1', () => {
    const c0 = classifyBooleanFunction([], ['A', 'B']);
    expect(c0.isConstant0).toBe(true);
    expect(c0.isConstant1).toBe(false);

    const c1 = classifyBooleanFunction([0, 1, 2, 3], ['A', 'B']);
    expect(c1.isConstant1).toBe(true);
    expect(c1.isConstant0).toBe(false);
  });

  it('should detect identity variable F = A', () => {
    // A=0,B=0(0): 0, A=0,B=1(1): 0, A=1,B=0(2): 1, A=1,B=1(3): 1
    const res = classifyBooleanFunction([2, 3], ['A', 'B']);
    expect(res.isIdentityVar).toBe('A');
  });

  it('should detect odd parity XOR (A ⊕ B)', () => {
    // XOR: m1 (01), m2 (10)
    const res = classifyBooleanFunction([1, 2], ['A', 'B']);
    expect(res.isParityOdd).toBe(true);
    expect(res.isBalanced).toBe(true);
    expect(res.isSymmetric).toBe(true);
  });

  it('should detect self-dual function (Majority function F = AB + BC + AC)', () => {
    // 3 variables: m3 (011), m5 (101), m6 (110), m7 (111)
    const res = classifyBooleanFunction([3, 5, 6, 7], ['A', 'B', 'C']);
    expect(res.isSelfDual).toBe(true);
    expect(res.isSymmetric).toBe(true);
    expect(res.isMonotonic).toBe(true);
  });

  it('should detect unateness per variable', () => {
    // F = A + B'
    // A is positive unate, B is negative unate
    // m0(00): 1, m1(01): 0, m2(10): 1, m3(11): 1
    const res = classifyBooleanFunction([0, 2, 3], ['A', 'B']);
    expect(res.isUnatePer['A']).toBe('positive');
    expect(res.isUnatePer['B']).toBe('negative');
  });
});
