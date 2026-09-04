import { describe, it, expect } from 'vitest';
import {
  tokenize,
  parseBooleanExpression,
  astToString,
  evaluateAST,
  generateTruthTable,
  buildCanonicalSOP,
  buildCanonicalPOS,
  quineMcCluskey,
  simplifyStepByStep,
  optimizeExpression,
} from '@engine/analysis/boolean';
import { checkBooleanEquivalence } from '@engine/analysis/validation';

describe('Boolean Expression Tokenizer & Parser', () => {
  it('should parse standard AND / OR notations', () => {
    const ast = parseBooleanExpression('A.B + C.D');
    expect(ast.type).toBe('OR');
  });

  it('should parse implicit AND (concatenation)', () => {
    const ast = parseBooleanExpression('AB + CD');
    expect(astToString(ast, { andOp: '·' })).toBe('A·B + C·D');
  });

  it('should handle postfix apostrophe negation and prefix negation', () => {
    const ast1 = parseBooleanExpression("A'.B + !C");
    const ast2 = parseBooleanExpression("(!A).B + ~C");
    const eq = checkBooleanEquivalence(ast1, ast2);
    expect(eq.isEquivalent).toBe(true);
  });

  it('should handle complex parenthesized expressions', () => {
    const ast = parseBooleanExpression('(A + B).(C + D)');
    expect(ast.type).toBe('AND');
    const val = evaluateAST(ast, { A: 1, B: 0, C: 0, D: 1 });
    expect(val).toBe(1);
  });

  it('should support XOR operations', () => {
    const ast = parseBooleanExpression('A ^ B');
    expect(evaluateAST(ast, { A: 1, B: 1 })).toBe(0);
    expect(evaluateAST(ast, { A: 1, B: 0 })).toBe(1);
    expect(evaluateAST(ast, { A: 0, B: 1 })).toBe(1);
    expect(evaluateAST(ast, { A: 0, B: 0 })).toBe(0);
  });
});

describe('Truth Table & Canonical Forms', () => {
  it('should generate accurate truth table for XOR', () => {
    const table = generateTruthTable('A ^ B', ['A', 'B']);
    expect(table.rowCount).toBe(4);
    expect(table.minterms).toEqual([1, 2]);
    expect(table.maxterms).toEqual([0, 3]);
  });

  it('should generate canonical SOP and POS', () => {
    const table = generateTruthTable('A.B + A.C', ['A', 'B', 'C']);
    const sop = buildCanonicalSOP(table.minterms, ['A', 'B', 'C']);
    const pos = buildCanonicalPOS(table.maxterms, ['A', 'B', 'C']);

    expect(sop.sigmaNotation).toContain('Σm');
    expect(pos.piNotation).toContain('ΠM');
  });
});

describe('Quine-McCluskey & Exact Minimization', () => {
  it('should simplify A.B + A.B\' to A', () => {
    const qm = quineMcCluskey([2, 3], [], ['A', 'B']); // m2 = 10, m3 = 11
    expect(qm.bestExpression).toBe('A');
  });

  it('should simplify Consensus Theorem: A.B + A\'.C + B.C to A.B + A\'.C', () => {
    // A=0,B=0,C=0(0): 0
    // A=0,B=0,C=1(1): 1 (A'.C)
    // A=0,B=1,C=0(2): 0
    // A=0,B=1,C=1(3): 1 (A'.C, B.C)
    // A=1,B=0,C=0(4): 0
    // A=1,B=0,C=1(5): 0
    // A=1,B=1,C=0(6): 1 (A.B)
    // A=1,B=1,C=1(7): 1 (A.B, B.C)
    const qm = quineMcCluskey([1, 3, 6, 7], [], ['A', 'B', 'C']);
    expect(qm.minimalSolutions.length).toBeGreaterThan(0);
    const terms = qm.minimalSolutions[0].terms;
    expect(terms).toContain("A'C");
    expect(terms).toContain('AB');
    expect(terms).not.toContain('BC');
  });

  it('should handle Don\'t-Care terms to further reduce expression', () => {
    // Minterms: [1], Don't-Care: [3] -> can merge to BC
    const qmWithDC = quineMcCluskey([1], [3], ['A', 'B', 'C']);
    expect(qmWithDC.bestExpression).toBe("A'C");
  });
});

describe('Step-by-Step Algebraic Simplifier & Verifier', () => {
  it('should produce step-by-step trace and 100% verification for A.B + A\'.C + B.C', () => {
    const trace = simplifyStepByStep("A.B + A'.C + B.C");
    expect(trace.isVerified).toBe(true);
    expect(trace.steps.length).toBeGreaterThanOrEqual(1);
    expect(trace.simplifiedExpression).not.toContain('B.C');
  });

  it('should verify absorption A + A.B -> A', () => {
    const trace = simplifyStepByStep('A + A.B');
    expect(trace.isVerified).toBe(true);
    expect(trace.simplifiedExpression).toBe('A');
  });

  it('should verify complement law A + A\' -> 1', () => {
    const trace = simplifyStepByStep("A + A'");
    expect(trace.isVerified).toBe(true);
    expect(trace.simplifiedExpression).toBe('1');
  });

  it('should verify contradiction A . A\' -> 0', () => {
    const trace = simplifyStepByStep("A . A'");
    expect(trace.isVerified).toBe(true);
    expect(trace.simplifiedExpression).toBe('0');
  });
});

describe('Multi-Target Expression Optimization', () => {
  it('should convert SOP to All-NAND format', () => {
    const res = optimizeExpression('A.B + C.D', 'all-nand');
    expect(res.expression).toContain("'");
    expect(res.mode).toBe('all-nand');
  });

  it('should convert to Minimal POS format', () => {
    const res = optimizeExpression('(A+B).(A+C)', 'minimal-pos');
    expect(res.mode).toBe('minimal-pos');
  });

  it('should support min-terms, min-depth, balanced and xor-optimized modes', () => {
    const resTerms = optimizeExpression('A.B + A.C + B.C', 'min-terms');
    expect(resTerms.termCount).toBeGreaterThanOrEqual(1);

    const resDepth = optimizeExpression('A.B + A.C + B.C', 'min-depth');
    expect(resDepth.depth).toBeGreaterThanOrEqual(1);

    const resBalanced = optimizeExpression('A.B + A.C + B.C', 'balanced');
    expect(resBalanced.gateCount).toBeGreaterThanOrEqual(1);

    const resXor = optimizeExpression("A'.B + A.B'", 'xor-optimized');
    expect(resXor.xorDetected).toBe(true);
    expect(resXor.expression).toContain('⊕');
  });
});

describe('Error Handling & Robustness', () => {
  it('should throw meaningful error on empty expression', () => {
    expect(() => parseBooleanExpression('')).toThrow();
  });

  it('should throw on double consecutive operators', () => {
    expect(() => parseBooleanExpression('A..B')).toThrow();
  });

  it('should throw on unbalanced parentheses', () => {
    expect(() => parseBooleanExpression('(A + B')).toThrow();
  });
});

describe('Property-Based Simplification Equivalence Verification', () => {
  it('should guarantee mathematical equivalence for 50 pseudo-random 3-variable Boolean functions', () => {
    const vars = ['A', 'B', 'C'];
    const total = 8;

    for (let seed = 1; seed <= 50; seed++) {
      // Generate deterministic minterms from seed
      const minterms: number[] = [];
      for (let m = 0; m < total; m++) {
        if (((seed * 37 + m * 17) % 7) > 3) {
          minterms.push(m);
        }
      }

      const sop = buildCanonicalSOP(minterms, vars);
      if (sop.expandedSOP && sop.expandedSOP !== '0' && sop.expandedSOP !== '1') {
        const trace = simplifyStepByStep(sop.expandedSOP);
        expect(trace.isVerified).toBe(true);

        const eq = checkBooleanEquivalence(sop.expandedSOP, trace.simplifiedExpression);
        expect(eq.isEquivalent).toBe(true);
      }
    }
  });
});
