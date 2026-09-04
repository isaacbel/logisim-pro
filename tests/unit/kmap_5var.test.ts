import { describe, it, expect } from 'vitest';
import {
  createKMapStructure,
  solveOptimalKMapGroups,
  validateKMapResult,
  mintermToKMapCoordinates,
  findAllValidGroups,
  analyzeGroupVariables,
} from '@engine/analysis/karnaugh';
import { generateTruthTable, parseBooleanExpression } from '@engine/analysis/boolean';
import { quineMcCluskey } from '@engine/analysis/boolean/quineMcCluskey';
import { checkBooleanEquivalence } from '@engine/analysis/validation/booleanEquivalence';

describe('5-Variable Karnaugh Map Engine (32 Cells, 2 Linked 4x4 Planes)', () => {
  const vars5 = ['A', 'B', 'C', 'D', 'E'];

  it('should initialize a 2-plane 4x4 structure with 32 cells correctly indexed', () => {
    const structure = createKMapStructure(vars5, [0, 1, 31]);
    expect(structure.numVars).toBe(5);
    expect(structure.numPlanes).toBe(2);
    expect(structure.planes.length).toBe(2);
    expect(structure.planes[0].grid.length).toBe(4);
    expect(structure.planes[0].grid[0].length).toBe(4);
    expect(structure.planes[1].grid.length).toBe(4);
    expect(structure.planes[1].grid[0].length).toBe(4);

    // Plane 0: E=0. Cell at AB=00, CD=00 -> 00000 = m0
    expect(structure.planes[0].grid[0][0].minterm).toBe(0);
    expect(structure.planes[0].grid[0][0].value).toBe(1);

    // Plane 1: E=1. Cell at AB=00, CD=00 -> 00001 = m1
    expect(structure.planes[1].grid[0][0].minterm).toBe(1);
    expect(structure.planes[1].grid[0][0].value).toBe(1);

    // Plane 1: E=1. Cell at AB=10 (r3), CD=10 (c3) -> 10101 = m21
    // Plane 1: E=1. Cell at AB=11 (r2), CD=11 (c2) -> 11111 = m31
    expect(structure.planes[1].grid[2][2].minterm).toBe(31);
    expect(structure.planes[1].grid[2][2].value).toBe(1);
  });

  it('should map minterms to exact (plane, row, col) coordinates', () => {
    // m0 = 00000 -> plane 0 (E=0), row 0 (AB=00), col 0 (CD=00)
    expect(mintermToKMapCoordinates(0, 5)).toEqual({ plane: 0, row: 0, col: 0 });

    // m1 = 00001 -> plane 1 (E=1), row 0 (AB=00), col 0 (CD=00)
    expect(mintermToKMapCoordinates(1, 5)).toEqual({ plane: 1, row: 0, col: 0 });

    // m31 = 11111 -> plane 1 (E=1), row 2 (AB=11), col 2 (CD=11)
    expect(mintermToKMapCoordinates(31, 5)).toEqual({ plane: 1, row: 2, col: 2 });
  });

  it('should eliminate variable E when grouping corresponding cells across E=0 and E=1 planes', () => {
    // Function F = A.B (covers all 8 minterms with AB=11: m24..m31)
    // In plane 0 (E=0): AB=11 has 4 cells (CD=00,01,11,10 -> m24, m26, m30, m28)
    // In plane 1 (E=1): AB=11 has 4 cells (CD=00,01,11,10 -> m25, m27, m31, m29)
    // Total 8 cells merged across both planes -> eliminates C, D, and E -> Result: AB
    const mintermsAB = [24, 25, 26, 27, 28, 29, 30, 31];
    const structure = createKMapStructure(vars5, mintermsAB);
    const solution = solveOptimalKMapGroups(structure, 'sop');

    expect(solution.selectedGroups.length).toBe(1);
    expect(solution.selectedGroups[0].spansPlanes).toBe(true);
    expect(solution.selectedGroups[0].size).toBe(8);
    expect(solution.simplifiedExpression).toBe('AB');

    // Validate 100% across all 32 combinations
    const val = validateKMapResult(structure, solution.simplifiedExpression);
    expect(val.isValid).toBe(true);
  });

  it('should solve non-trivial 5-variable function with 100% equivalence (32/32 combinations)', () => {
    // Non-trivial test function F(A,B,C,D,E) = A.B.C + A'.D.E + B'.C'.E'
    const ast = parseBooleanExpression("A.B.C + A'.D.E + B'.C'.E'");
    const tt = generateTruthTable(ast, vars5);
    expect(tt.rowCount).toBe(32);

    const structure = createKMapStructure(vars5, tt.minterms);
    const solution = solveOptimalKMapGroups(structure, 'sop');

    // 100% truth table equivalence
    const val = validateKMapResult(structure, solution.simplifiedExpression);
    expect(val.isValid).toBe(true);
    expect(val.mismatches).toEqual([]);

    // Compare with Quine-McCluskey
    const qmcResult = quineMcCluskey(tt.minterms, [], vars5);
    const eq = checkBooleanEquivalence(solution.simplifiedExpression, qmcResult.bestExpression);
    expect(eq.isEquivalent).toBe(true);
  });

  it('should support 5-variable POS mode (grouping 0s across planes)', () => {
    // Function F = A + E (0-cells are when A=0 AND E=0)
    // 0-cells: minterms where bit 0 is 0 and bit 4 is 0 (m0, m2, m4, m6, m8, m10, m12, m14)
    const minterms = [];
    for (let i = 0; i < 32; i++) {
      const a = (i >> 4) & 1;
      const e = i & 1;
      if (a === 1 || e === 1) minterms.push(i);
    }
    const structure = createKMapStructure(vars5, minterms);
    const solution = solveOptimalKMapGroups(structure, 'pos');

    expect(solution.simplifiedExpression).toContain('A');
    expect(solution.simplifiedExpression).toContain('E');

    const val = validateKMapResult(structure, solution.simplifiedExpression);
    expect(val.isValid).toBe(true);
  });

  it('should provide clear educational explanations of variable elimination', () => {
    // Group cells m0 (00000) and m1 (00001) -> E changes (0 and 1), ABCD=0000 constant -> A'B'C'D'
    const analysis = analyzeGroupVariables([0, 1], vars5, 'sop');
    expect(analysis.term).toBe("A'B'C'D'");
    expect(analysis.changingVariables).toEqual(['E']);
    expect(analysis.invariantVariables.length).toBe(4);
    expect(analysis.explanation).toContain("Changing variables (E) eliminate");
  });
});
