import { describe, it, expect } from 'vitest';
import {
  createKMapStructure,
  solveOptimalKMapGroups,
  validateKMapResult,
  mintermToKMapCoordinates,
  analyzeGroupVariables,
} from '@engine/analysis/karnaugh';
import { generateTruthTable, parseBooleanExpression } from '@engine/analysis/boolean';
import { quineMcCluskey } from '@engine/analysis/boolean/quineMcCluskey';
import { checkBooleanEquivalence } from '@engine/analysis/validation/booleanEquivalence';

describe('6-Variable Karnaugh Map Engine (64 Cells, 4 Linked 4x4 Planes)', () => {
  const vars6 = ['A', 'B', 'C', 'D', 'E', 'F'];

  it('should initialize 4 planes (EF=00, 01, 11, 10) with 64 total cells', () => {
    const structure = createKMapStructure(vars6, [0, 63]);
    expect(structure.numVars).toBe(6);
    expect(structure.numPlanes).toBe(4);
    expect(structure.planes.length).toBe(4);
    expect(structure.planes[0].planeHeader).toBe('EF = 00');
    expect(structure.planes[1].planeHeader).toBe('EF = 01');
    expect(structure.planes[2].planeHeader).toBe('EF = 11');
    expect(structure.planes[3].planeHeader).toBe('EF = 10');

    // Plane 0 (EF=00), AB=00 (r0), CD=00 (c0) -> 000000 = m0
    expect(structure.planes[0].grid[0][0].minterm).toBe(0);
    expect(structure.planes[0].grid[0][0].value).toBe(1);

    // Plane 2 (EF=11), AB=11 (r2), CD=11 (c2) -> 111111 = m63
    expect(structure.planes[2].grid[2][2].minterm).toBe(63);
    expect(structure.planes[2].grid[2][2].value).toBe(1);
  });

  it('should map 6-variable minterms to exact (plane, row, col) coordinates with Gray code planes', () => {
    // m0 = 000000 -> Plane 0 (EF=00), Row 0 (AB=00), Col 0 (CD=00)
    expect(mintermToKMapCoordinates(0, 6)).toEqual({ plane: 0, row: 0, col: 0 });

    // m3 = 000011 -> Plane 2 (EF=11 is index 2 in Gray code), Row 0 (AB=00), Col 0 (CD=00)
    expect(mintermToKMapCoordinates(3, 6)).toEqual({ plane: 2, row: 0, col: 0 });

    // m63 = 111111 -> Plane 2 (EF=11), Row 2 (AB=11), Col 2 (CD=11)
    expect(mintermToKMapCoordinates(63, 6)).toEqual({ plane: 2, row: 2, col: 2 });
  });

  it('should eliminate 2 variables across all 4 planes for a global group of 32 or 16 cells', () => {
    // Function F = A (32 minterms: m32..m63 where bit A is 1)
    // Spans all 4 planes (EF=00,01,11,10), rows AB=10,11, all cols -> eliminates B, C, D, E, F -> Result: A
    const mintermsA = [];
    for (let i = 32; i < 64; i++) mintermsA.push(i);

    const structure = createKMapStructure(vars6, mintermsA);
    const solution = solveOptimalKMapGroups(structure, 'sop');

    expect(solution.selectedGroups.length).toBe(1);
    expect(solution.selectedGroups[0].size).toBe(32);
    expect(solution.simplifiedExpression).toBe('A');

    const val = validateKMapResult(structure, solution.simplifiedExpression);
    expect(val.isValid).toBe(true);
  });

  it('should solve a non-trivial 6-variable function with 100% equivalence (64/64 combinations)', () => {
    // Non-trivial test function F(A,B,C,D,E,F) = A.B.E + C.D.F' + A'.B'.C'.D'
    const ast = parseBooleanExpression("A.B.E + C.D.F' + A'.B'.C'.D'");
    const tt = generateTruthTable(ast, vars6);
    expect(tt.rowCount).toBe(64);

    const structure = createKMapStructure(vars6, tt.minterms);
    const solution = solveOptimalKMapGroups(structure, 'sop');

    // 100% truth table equivalence across all 64 cells
    const val = validateKMapResult(structure, solution.simplifiedExpression);
    expect(val.isValid).toBe(true);
    expect(val.mismatches).toEqual([]);

    // Verify equivalence with Quine-McCluskey
    const qmcResult = quineMcCluskey(tt.minterms, [], vars6);
    const eq = checkBooleanEquivalence(solution.simplifiedExpression, qmcResult.bestExpression);
    expect(eq.isEquivalent).toBe(true);
  });

  it('should support 6-variable POS mode (grouping 0s across 4 planes)', () => {
    // Function F = A + B + F
    const minterms = [];
    for (let i = 0; i < 64; i++) {
      const a = (i >> 5) & 1;
      const b = (i >> 4) & 1;
      const f = i & 1;
      if (a === 1 || b === 1 || f === 1) minterms.push(i);
    }
    const structure = createKMapStructure(vars6, minterms);
    const solution = solveOptimalKMapGroups(structure, 'pos');

    expect(solution.simplifiedExpression).toContain('A');
    expect(solution.simplifiedExpression).toContain('B');
    expect(solution.simplifiedExpression).toContain('F');

    const val = validateKMapResult(structure, solution.simplifiedExpression);
    expect(val.isValid).toBe(true);
  });
});
