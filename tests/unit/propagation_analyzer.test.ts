import { describe, it, expect } from 'vitest';
import { analyzeExpressionTiming } from '@engine/analysis/boolean/propagationAnalyzer';

describe('Propagation & Timing Analyzer', () => {
  it('should calculate gate depth of simple expressions', () => {
    // A.B -> depth = 1 (AND)
    const t1 = analyzeExpressionTiming('A.B');
    expect(t1.gateDepth).toBe(1);

    // A.B + C.D -> depth = 2 (AND -> OR)
    const t2 = analyzeExpressionTiming('A.B + C.D');
    expect(t2.gateDepth).toBe(2);

    // (A + B).(C + D)' -> depth = 3 (OR -> NOT -> AND)
    const t3 = analyzeExpressionTiming("(A + B).(C + D)'");
    expect(t3.gateDepth).toBe(3);
  });

  it('should measure fan-in and fan-out', () => {
    const res = analyzeExpressionTiming('A.B.C + A.D');
    expect(res.fanInMax).toBe(3); // A.B.C has 3 inputs
    expect(res.fanOutEstimate).toBe(2); // A appears twice
  });
});
