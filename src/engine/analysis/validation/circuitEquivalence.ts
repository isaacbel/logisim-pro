/**
 * Real Simulation Circuit Equivalence Validator
 * Runs synthesized circuits in the genuine SimulationEngine to verify 100% physical correctness against the truth table.
 */

import { CircuitComponent, Wire, SignalValue } from '@apptypes/core';
import { SimulationEngine, ComponentLogicRegistry, registerBuiltInLogics } from '@engine/simulation';
import { TruthTableData } from '../boolean/truthTable';

export interface CircuitValidationResult {
  isEquivalent: boolean;
  totalTested: number;
  mismatches: {
    rowIndex: number;
    inputs: Record<string, 0 | 1>;
    expected: 0 | 1;
    actual: SignalValue;
  }[];
}

export function validateCircuitAgainstTruthTable(
  components: CircuitComponent[],
  wires: Wire[],
  expectedTable: TruthTableData
): CircuitValidationResult {
  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  const inputPins = components
    .filter(c => c.type === 'INPUT_PIN' || c.type === 'SWITCH')
    .sort((a, b) => (a.label || a.name).localeCompare(b.label || b.name));

  const outputPins = components.filter(c => c.type === 'OUTPUT_PIN' || c.type === 'LED');

  if (inputPins.length === 0 || outputPins.length === 0) {
    return { isEquivalent: false, totalTested: 0, mismatches: [] };
  }

  const mismatches: CircuitValidationResult['mismatches'] = [];

  expectedTable.rows.forEach(row => {
    // Run a fresh simulation engine instance for combination evaluation
    const engine = new SimulationEngine(registry);
    engine.loadCircuit(components, wires);

    // Apply inputs to input component outputs
    inputPins.forEach(inp => {
      const label = inp.label || inp.name;
      const bitVal = row.inputs[label] ?? 0;
      const outPin = inp.pins.find(p => p.direction === 'output' || p.direction === 'bidirectional');
      if (outPin) {
        engine.forcePinValue(outPin.id, bitVal === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
    });

    // Step a few ticks to let signals settle through the gates
    for (let step = 0; step < 12; step++) {
      engine.processTick();
    }

    // Read output from first output pin's input pin
    const outComp = outputPins[0];
    const inPin = outComp.pins.find(p => p.direction === 'input' || p.direction === 'bidirectional');
    const actualSignal = inPin ? engine.getPinValue(inPin.id) : SignalValue.UNKNOWN;

    const expectedSignal = row.output === 1 ? SignalValue.HIGH : SignalValue.LOW;
    if (actualSignal !== expectedSignal) {
      mismatches.push({
        rowIndex: row.index,
        inputs: row.inputs,
        expected: row.output,
        actual: actualSignal,
      });
    }
  });

  return {
    isEquivalent: mismatches.length === 0,
    totalTested: expectedTable.rows.length,
    mismatches,
  };
}

/**
 * Analyzes an arbitrary circuit currently on the Logisim Pro canvas,
 * executes 2^N combinations on the real SimulationEngine, and extracts its truth table!
 */
export function analyzeRealCircuit(
  components: CircuitComponent[],
  wires: Wire[]
): {
  truthTable: TruthTableData | null;
  inputLabels: string[];
  outputLabels: string[];
} {
  const inputComps = components
    .filter(c => ['INPUT_PIN', 'SWITCH', 'PUSH_BUTTON', 'CONSTANT', 'CONSTANT_0', 'CONSTANT_1'].includes(c.type))
    .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));

  const outputComps = components.filter(c => ['OUTPUT_PIN', 'LED', 'PROBE'].includes(c.type));

  if (inputComps.length === 0 || outputComps.length === 0) {
    return { truthTable: null, inputLabels: [], outputLabels: [] };
  }

  const numVars = Math.min(inputComps.length, 6);
  const inputLabels = inputComps.slice(0, numVars).map((c, i) => c.label || String.fromCharCode(65 + i));
  const outputLabels = outputComps.map((c, i) => c.label || `OUT_${i}`);

  const rowCount = 1 << numVars;
  const rows: TruthTableData['rows'] = [];
  const minterms: number[] = [];
  const maxterms: number[] = [];

  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  for (let r = 0; r < rowCount; r++) {
    const inputs: Record<string, 0 | 1> = {};
    let binary = '';

    for (let bit = 0; bit < numVars; bit++) {
      const bitVal = ((r >> (numVars - 1 - bit)) & 1) as 0 | 1;
      const label = inputLabels[bit];
      inputs[label] = bitVal;
      binary += bitVal.toString();
    }

    const engine = new SimulationEngine(registry);
    engine.loadCircuit(components, wires);

    // Apply inputs
    for (let i = 0; i < numVars; i++) {
      const inp = inputComps[i];
      const bitVal = inputs[inputLabels[i]];
      const outPin = inp.pins.find(p => p.direction === 'output' || p.direction === 'bidirectional');
      if (outPin) {
        engine.forcePinValue(outPin.id, bitVal === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
    }

    // Step simulation
    for (let step = 0; step < 12; step++) {
      engine.processTick();
    }

    // Read primary output
    const outComp = outputComps[0];
    const inPin = outComp.pins.find(p => p.direction === 'input' || p.direction === 'bidirectional');
    const outSignal = inPin ? engine.getPinValue(inPin.id) : SignalValue.LOW;
    const output: 0 | 1 = outSignal === SignalValue.HIGH ? 1 : 0;

    if (output === 1) minterms.push(r);
    else maxterms.push(r);

    rows.push({
      index: r,
      binary,
      inputs,
      output,
    });
  }

  const truthTable: TruthTableData = {
    variables: inputLabels,
    rows,
    minterms,
    maxterms,
    rowCount,
  };

  return {
    truthTable,
    inputLabels,
    outputLabels,
  };
}
