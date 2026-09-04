import { describe, it, expect } from 'vitest';
import { analyzeHazards } from '@engine/analysis/boolean/hazardAnalyzer';

describe('Hazard Analyzer', () => {
  it('should detect static-1 hazard in A.B + A\'.C and suggest redundant consensus term B.C', () => {
    // F = AB + A'C
    // Minterms: 1 (001), 3 (011), 6 (110), 7 (111)
    // When B=1, C=1: transition on A (m3=011 to m7=111) crosses between A'C and AB
    const minterms = [1, 3, 6, 7];
    const sopTerms = ['AB', "A'C"];
    const variables = ['A', 'B', 'C'];

    const res = analyzeHazards(minterms, sopTerms, variables);
    expect(res.hasHazards).toBe(true);
    expect(res.hazards.some(h => h.type === 'static-1' && h.variable === 'A')).toBe(true);
    expect(res.redundantTerms).toContain('BC');
  });

  it('should report no hazards when redundant consensus term is present', () => {
    const minterms = [1, 3, 6, 7];
    const sopTerms = ['AB', "A'C", 'BC'];
    const variables = ['A', 'B', 'C'];

    const res = analyzeHazards(minterms, sopTerms, variables);
    const static1Hazards = res.hazards.filter(h => h.type === 'static-1');
    expect(static1Hazards.length).toBe(0);
  });
});
