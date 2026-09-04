import { describe, it, expect } from 'vitest';
import {
  parseBooleanExpression,
  generateTruthTable,
  synthesizeCircuitFromExpression,
} from '@engine/analysis/boolean';
import {
  createKMapStructure,
  solveOptimalKMapGroups,
  validateKMapResult,
} from '@engine/analysis/karnaugh';
import {
  validateCircuitAgainstTruthTable,
  analyzeRealCircuit,
  checkBooleanEquivalence,
} from '@engine/analysis/validation';

describe('Mandatory End-to-End Pipeline: Expression -> Truth Table -> K-Map -> Synthesis -> Real Simulation', () => {
  it('Pipeline Test 1: 3-Variable Expression (Majority Function A.B + B.C + A.C)', () => {
    const expr = 'A.B + B.C + A.C';
    const vars = ['A', 'B', 'C'];

    // 1. Parse & evaluate AST truth table
    const ast = parseBooleanExpression(expr);
    const ttOriginal = generateTruthTable(ast, vars);
    expect(ttOriginal.rowCount).toBe(8);

    // 2. Build K-Map structure
    const kmap = createKMapStructure(vars, ttOriginal.minterms);

    // 3. Solve K-Map
    const kmapSol = solveOptimalKMapGroups(kmap, 'sop');
    expect(kmapSol.simplifiedExpression).toBeTruthy();

    // 4. Validate K-map equivalence
    const kmapVal = validateKMapResult(kmap, kmapSol.simplifiedExpression);
    expect(kmapVal.isValid).toBe(true);

    // 5. Synthesize REAL Logisim Pro components and wires
    const circuit = synthesizeCircuitFromExpression(kmapSol.simplifiedExpression, 'standard', 50, 50, 30);
    expect(circuit.components.length).toBeGreaterThanOrEqual(4);
    expect(circuit.wires.length).toBeGreaterThanOrEqual(3);

    // 6. Run REAL SimulationEngine validation across all 8 input combinations
    const validation = validateCircuitAgainstTruthTable(circuit.components, circuit.wires, ttOriginal);
    expect(validation.isEquivalent).toBe(true);
    expect(validation.totalTested).toBe(8);
    expect(validation.mismatches.length).toBe(0);

    // 7. Analyze Real Circuit directly (Circuit -> Truth Table extraction)
    const analyzed = analyzeRealCircuit(circuit.components, circuit.wires);
    expect(analyzed.truthTable).toBeDefined();
    expect(analyzed.truthTable!.minterms.sort()).toEqual(ttOriginal.minterms.sort());
  });

  it('Pipeline Test 2: 4-Variable Function F = A.B + C.D', () => {
    const expr = 'A.B + C.D';
    const vars = ['A', 'B', 'C', 'D'];

    // Expression -> Truth Table
    const ast = parseBooleanExpression(expr);
    const ttOriginal = generateTruthTable(ast, vars);

    // Truth Table -> K-Map
    const kmap = createKMapStructure(vars, ttOriginal.minterms);
    const kmapSol = solveOptimalKMapGroups(kmap, 'sop');

    // Synthesize real circuit
    const circuit = synthesizeCircuitFromExpression(kmapSol.simplifiedExpression, 'standard');

    // Validate synthesized circuit against genuine SimulationEngine (all 16 combinations)
    const validation = validateCircuitAgainstTruthTable(circuit.components, circuit.wires, ttOriginal);
    expect(validation.isEquivalent).toBe(true);
    expect(validation.totalTested).toBe(16);
    expect(validation.mismatches.length).toBe(0);
  });

  it('Pipeline Test 3: 5-Variable Non-Trivial Pipeline', () => {
    const expr = "A.B.E + C.D.E' + B.C.D";
    const vars = ['A', 'B', 'C', 'D', 'E'];

    // Expression -> Truth Table (32 rows)
    const ast = parseBooleanExpression(expr);
    const ttOriginal = generateTruthTable(ast, vars);
    expect(ttOriginal.rowCount).toBe(32);

    // Truth Table -> 5-Var K-Map
    const kmap = createKMapStructure(vars, ttOriginal.minterms);
    const kmapSol = solveOptimalKMapGroups(kmap, 'sop');

    // Validate K-map solution 100%
    const kmapVal = validateKMapResult(kmap, kmapSol.simplifiedExpression);
    expect(kmapVal.isValid).toBe(true);

    // Synthesize real circuit
    const circuit = synthesizeCircuitFromExpression(kmapSol.simplifiedExpression, 'standard');

    // Validate synthesized circuit against genuine SimulationEngine (all 32 combinations)
    const validation = validateCircuitAgainstTruthTable(circuit.components, circuit.wires, ttOriginal);
    expect(validation.isEquivalent).toBe(true);
    expect(validation.totalTested).toBe(32);
    expect(validation.mismatches.length).toBe(0);
  });
});
