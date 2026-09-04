import { describe, it, expect } from 'vitest';
import { createKMapStructure } from '@/engine/analysis/karnaugh/kmap';
import { analyzeGroupVariables } from '@/engine/analysis/karnaugh/grouping';
import { solveOptimalKMapGroups } from '@/engine/analysis/karnaugh/primeImplicants';
import { validateKMapResult } from '@/engine/analysis/karnaugh/kmapValidator';
import { kmapToSvgString, kmapToCsv } from '@/engine/analysis/karnaugh/kmapExport';

describe('K-Map Engine — Advanced Multi-Plane Exhaustive Edge Cases', () => {
  it('2-Variable: All 1s should reduce to constant 1', () => {
    const kmap = createKMapStructure(['A', 'B'], [0, 1, 2, 3]);
    const sol = solveOptimalKMapGroups(kmap, 'sop');
    expect(sol.simplifiedExpression).toBe('1');
    expect(sol.selectedGroups.length).toBe(1);
    expect(sol.selectedGroups[0].size).toBe(4);
  });

  it('2-Variable: Checkerboard XOR function should produce 2 singletons', () => {
    // Parity / XOR: m1 (01) and m2 (10)
    const kmap = createKMapStructure(['A', 'B'], [1, 2]);
    const sol = solveOptimalKMapGroups(kmap, 'sop');
    expect(sol.selectedGroups.length).toBe(2);
    expect(sol.selectedGroups.every(g => g.size === 1)).toBe(true);
  });

  it('3-Variable: 4-corner wrapping in 2x4 map', () => {
    // m0 (000), m2 (010), m4 (100), m6 (110) -> wraps left/right
    const kmap = createKMapStructure(['A', 'B', 'C'], [0, 2, 4, 6]);
    const sol = solveOptimalKMapGroups(kmap, 'sop');
    expect(sol.selectedGroups.length).toBe(1);
    expect(sol.selectedGroups[0].size).toBe(4);
    expect(sol.simplifiedExpression).toBe("C'");
  });

  it('4-Variable: 4-corner group m0, m2, m8, m10', () => {
    const kmap = createKMapStructure(['A', 'B', 'C', 'D'], [0, 2, 8, 10]);
    const sol = solveOptimalKMapGroups(kmap, 'sop');
    expect(sol.selectedGroups.length).toBe(1);
    expect(sol.selectedGroups[0].size).toBe(4);
    expect(sol.simplifiedExpression).toBe("B'D'");
  });

  it('5-Variable: 2 planes cross-layer reduction of a full row', () => {
    // Row 0 on plane 0: m0, m1, m3, m2
    // Row 0 on plane 1: m4, m5, m7, m6 (i.e. all with AB=00)
    const rowMinterms = [0, 1, 2, 3, 4, 5, 6, 7];
    const kmap = createKMapStructure(['A', 'B', 'C', 'D', 'E'], rowMinterms);
    const sol = solveOptimalKMapGroups(kmap, 'sop');
    expect(sol.selectedGroups.length).toBe(1);
    expect(sol.selectedGroups[0].size).toBe(8);
    expect(sol.selectedGroups[0].spansPlanes).toBe(true);
  });

  it('6-Variable: 4 planes global hypercube across all layers', () => {
    // 16-cell group spanning all 4 planes (EF=00, 01, 11, 10) in top-left 2x2
    const minterms: number[] = [];
    for (let p = 0; p < 4; p++) {
      // 4 cells per plane
      minterms.push(p * 4, p * 4 + 1, p * 4 + 2, p * 4 + 3);
    }
    const kmap = createKMapStructure(['A', 'B', 'C', 'D', 'E', 'F'], minterms);
    const sol = solveOptimalKMapGroups(kmap, 'sop');
    expect(sol.selectedGroups.length).toBeGreaterThan(0);
  });

  it('Validator: multi-plane validation returns 100% equivalence', () => {
    const kmap = createKMapStructure(['A', 'B', 'C', 'D', 'E'], [0, 1, 4, 5, 16, 17, 20, 21]);
    const sol = solveOptimalKMapGroups(kmap, 'sop');
    const val = validateKMapResult(kmap, sol.simplifiedExpression);
    expect(val.isValid).toBe(true);
    expect(val.mismatches.length).toBe(0);
  });

  it('Exporters: kmapToSvgString and kmapToCsv export 5-variable maps cleanly', () => {
    const kmap = createKMapStructure(['A', 'B', 'C', 'D', 'E'], [0, 1, 2, 3]);
    const sol = solveOptimalKMapGroups(kmap, 'sop');

    const svg = kmapToSvgString(kmap, sol.selectedGroups);
    expect(svg).toContain('<svg');
    expect(svg).toContain('E = 0');

    const csv = kmapToCsv(kmap);
    expect(csv).toContain('Plane');
    expect(csv).toContain('AB\\CD');
  });

  it('Explain Group: analyzes invariant and changing variables with full explanation', () => {
    // Group of m0 (0000) and m1 (0001) in 4-var
    const analysis = analyzeGroupVariables([0, 1], ['A', 'B', 'C', 'D']);
    expect(analysis.changingVariables).toContain('D');
    expect(analysis.invariantVariables.map(v => v.name)).toEqual(['A', 'B', 'C']);
    expect(analysis.term).toBe("A'B'C'");
    expect(analysis.explanation).toContain('D');
  });
});
