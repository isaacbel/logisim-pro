import { describe, it, expect } from 'vitest';
import {
  generateGrayCode,
  createKMapStructure,
  solveOptimalKMapGroups,
  validateKMapResult,
} from '@engine/analysis/karnaugh';

describe('Gray Code Generator', () => {
  it('should generate valid 2-bit Gray code: 00, 01, 11, 10', () => {
    const gc = generateGrayCode(2);
    expect(gc).toEqual(['00', '01', '11', '10']);
  });

  it('should ensure adjacent elements differ by exactly 1 bit', () => {
    const gc = generateGrayCode(3);
    expect(gc.length).toBe(8);
    for (let i = 0; i < gc.length; i++) {
      const next = gc[(i + 1) % gc.length];
      let diffs = 0;
      for (let b = 0; b < 3; b++) {
        if (gc[i][b] !== next[b]) diffs++;
      }
      expect(diffs).toBe(1);
    }
  });
});

describe('K-Map Grid & Solver', () => {
  it('should generate 2-variable K-map and solve A.B', () => {
    const structure = createKMapStructure(['A', 'B'], [3]);
    expect(structure.grid.length).toBe(2);
    expect(structure.grid[0].length).toBe(2);

    const solution = solveOptimalKMapGroups(structure);
    expect(solution.simplifiedExpression).toBe('AB');

    const val = validateKMapResult(structure, solution.simplifiedExpression);
    expect(val.isValid).toBe(true);
  });

  it('should solve 3-variable K-map with edge wrapping', () => {
    // Minterms m0 (000), m2 (010) -> can merge across col 00 and col 10 (horizontal wrapping) -> A'C'
    const structure = createKMapStructure(['A', 'B', 'C'], [0, 2]);
    const solution = solveOptimalKMapGroups(structure);
    expect(solution.selectedGroups.length).toBe(1);
    expect(solution.selectedGroups[0].wrapsHorizontal).toBe(true);
    expect(solution.simplifiedExpression).toBe("A'C'");
  });

  it('should solve 4-variable K-map 4-corner group m0, m2, m8, m10 -> B\'D\'', () => {
    // 4 corners:
    // m0 = 0000 (Row 00, Col 00)
    // m2 = 0010 (Row 00, Col 10)
    // m8 = 1000 (Row 10, Col 00)
    // m10 = 1010 (Row 10, Col 10)
    const structure = createKMapStructure(['A', 'B', 'C', 'D'], [0, 2, 8, 10]);
    const solution = solveOptimalKMapGroups(structure);
    expect(solution.selectedGroups.length).toBe(1);
    expect(solution.selectedGroups[0].wrapsCorners).toBe(true);
    expect(solution.simplifiedExpression).toBe("B'D'");

    const val = validateKMapResult(structure, solution.simplifiedExpression);
    expect(val.isValid).toBe(true);
  });

  it('should solve K-map in POS mode by grouping 0s', () => {
    // Function F = A + B (minterms: 1, 2, 3; maxterm / 0-cell: 0)
    // In POS mode, cell 0 is grouped -> maxterm is (A + B)
    const structure = createKMapStructure(['A', 'B'], [1, 2, 3]);
    const solution = solveOptimalKMapGroups(structure, 'pos');
    expect(solution.simplifiedExpression).toContain('A');
    expect(solution.simplifiedExpression).toContain('B');
  });

  it('should generate a valid Prime Implicant Chart matrix', () => {
    const structure = createKMapStructure(['A', 'B'], [1, 2, 3]);
    const solution = solveOptimalKMapGroups(structure, 'sop');
    expect(solution.chart.targetMinterms).toEqual([1, 2, 3]);
    expect(solution.chart.rows.length).toBeGreaterThanOrEqual(2);
    expect(solution.chart.rows[0].covers).toBeDefined();
  });
});
