/**
 * Tests for ComparePanel ranking logic (pure data, no DOM)
 * The SolutionEntry ranking algorithm is extracted and tested here.
 */

import { describe, it, expect } from 'vitest';

// Reproduces the ranking logic from ComparePanel.tsx
interface SolutionEntry {
  id: string;
  name: string;
  expression: string;
  literals: number;
  terms: number;
  gates: number;
  depth: number;
  description: string;
}

type OptimizationTarget = 'gates' | 'literals' | 'terms' | 'depth' | 'balanced';

function rankSolutions(solutions: SolutionEntry[], target: OptimizationTarget): SolutionEntry[] {
  return [...solutions].sort((a, b) => {
    if (target === 'gates') return a.gates - b.gates || a.literals - b.literals;
    if (target === 'literals') return a.literals - b.literals || a.gates - b.gates;
    if (target === 'terms') return a.terms - b.terms || a.literals - b.literals;
    if (target === 'depth') return a.depth - b.depth || a.gates - b.gates;
    // Balanced: 0.5 * gates + 0.3 * depth + 0.2 * literals
    const scoreA = a.gates * 0.5 + a.depth * 0.3 + a.literals * 0.2;
    const scoreB = b.gates * 0.5 + b.depth * 0.3 + b.literals * 0.2;
    return scoreA - scoreB;
  });
}

const MOCK_SOLUTIONS: SolutionEntry[] = [
  { id: 'original', name: 'Original', expression: 'A.B + A.C + B.C', literals: 6, terms: 3, gates: 5, depth: 3, description: 'Input form' },
  { id: 'sop', name: 'Min SOP', expression: "AB + AC + BC", literals: 6, terms: 3, gates: 4, depth: 2, description: 'Minimal SOP' },
  { id: 'nand', name: 'All NAND', expression: "NAND form", literals: 6, terms: 4, gates: 6, depth: 2, description: 'NAND universal' },
  { id: 'kmap', name: 'K-Map', expression: "AB + BC + AC", literals: 6, terms: 3, gates: 3, depth: 2, description: 'Karnaugh minimal' },
];

describe('ComparePanel Ranking Logic', () => {
  it('should rank by minimum gate count', () => {
    const ranked = rankSolutions(MOCK_SOLUTIONS, 'gates');
    expect(ranked[0].id).toBe('kmap'); // 3 gates
    expect(ranked[ranked.length - 1].id).toBe('nand'); // 6 gates
  });

  it('should rank by minimum literal count (tie-breaks by gates)', () => {
    const ranked = rankSolutions(MOCK_SOLUTIONS, 'literals');
    // All have 6 literals, so secondary sort by gates applies
    expect(ranked[0].gates).toBeLessThanOrEqual(ranked[1].gates);
  });

  it('should rank by minimum term count', () => {
    const ranked = rankSolutions(MOCK_SOLUTIONS, 'terms');
    expect(ranked[0].terms).toBeLessThanOrEqual(ranked[1].terms);
    // nand has 4 terms, all others 3 → nand should be last
    expect(ranked[ranked.length - 1].id).toBe('nand');
  });

  it('should rank by minimum depth', () => {
    const ranked = rankSolutions(MOCK_SOLUTIONS, 'depth');
    expect(ranked[0].depth).toBeLessThanOrEqual(ranked[ranked.length - 1].depth);
    // original has depth 3, all others have 2
    expect(ranked[ranked.length - 1].id).toBe('original');
  });

  it('should produce a balanced score ranking', () => {
    const ranked = rankSolutions(MOCK_SOLUTIONS, 'balanced');
    // kmap: 3*0.5 + 2*0.3 + 6*0.2 = 1.5 + 0.6 + 1.2 = 3.3 → lowest = best
    expect(ranked[0].id).toBe('kmap');
  });

  it('should handle single solution gracefully', () => {
    const single = [MOCK_SOLUTIONS[0]];
    const ranked = rankSolutions(single, 'gates');
    expect(ranked.length).toBe(1);
    expect(ranked[0].id).toBe('original');
  });

  it('should handle empty list gracefully', () => {
    const ranked = rankSolutions([], 'balanced');
    expect(ranked).toEqual([]);
  });
});
