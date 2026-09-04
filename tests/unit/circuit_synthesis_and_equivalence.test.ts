import { describe, it, expect } from 'vitest';
import { synthesizeCircuitFromExpression } from '@engine/analysis/boolean/expressionToCircuit';
import { generateTruthTable } from '@engine/analysis/boolean/truthTable';
import { validateCircuitAgainstTruthTable } from '@engine/analysis/validation/circuitEquivalence';

describe('Real Circuit Synthesis & Simulation Equivalence', () => {
  it('should synthesize real Logisim components and wires for A.B + C.D', () => {
    const synthesized = synthesizeCircuitFromExpression('A.B + C.D', 'standard');
    expect(synthesized.components.length).toBeGreaterThanOrEqual(5); // 4 inputs, 2 AND, 1 OR, 1 output
    expect(synthesized.wires.length).toBeGreaterThanOrEqual(4);

    // Verify all pins on wires exist in components
    const allPinIds = new Set(synthesized.components.flatMap(c => c.pins.map(p => p.id)));
    for (const wire of synthesized.wires) {
      expect(allPinIds.has(wire.fromPinId)).toBe(true);
      expect(allPinIds.has(wire.toPinId)).toBe(true);
    }
  });

  it('should verify that simulated circuit for A.B + A\'.C matches truth table on 100% of rows', () => {
    const expr = "A.B + A'.C";
    const synthesized = synthesizeCircuitFromExpression(expr, 'standard');
    const table = generateTruthTable(expr, ['A', 'B', 'C']);

    const validation = validateCircuitAgainstTruthTable(
      synthesized.components,
      synthesized.wires,
      table
    );

    expect(validation.isEquivalent).toBe(true);
    expect(validation.totalTested).toBe(8);
    expect(validation.mismatches.length).toBe(0);
  });

  it('should verify that simulated circuit for XOR (A\'.B + A.B\') matches truth table on 100% of rows', () => {
    const expr = "A'.B + A.B'";
    const synthesized = synthesizeCircuitFromExpression(expr, 'standard');
    const table = generateTruthTable(expr, ['A', 'B']);

    const validation = validateCircuitAgainstTruthTable(
      synthesized.components,
      synthesized.wires,
      table
    );

    expect(validation.isEquivalent).toBe(true);
    expect(validation.totalTested).toBe(4);
    expect(validation.mismatches.length).toBe(0);
  });
});
