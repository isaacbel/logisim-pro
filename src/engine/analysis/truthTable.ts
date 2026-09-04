/**
 * Truth Table Generator
 * Automatically generates truth tables for combinational circuits.
 */

import { SignalValue } from '@apptypes/core';
import type { TruthTableData, TruthTableRow, CircuitComponent, Wire } from '@apptypes/core';
import { ComponentLogicRegistry, SimulationEngine } from '@engine/simulation';

/**
 * Runs the circuit for all 2^n input combinations and records outputs.
 * Uses the live SimulationEngine to guarantee 100% fidelity with live simulation.
 */
export function generateTruthTable(
  inputPinIds: string[],
  outputPinIds: string[],
  inputNames: string[],
  outputNames: string[],
  registry: ComponentLogicRegistry,
  components: CircuitComponent[],
  wires: Wire[] = [],
): TruthTableData {
  const rows: TruthTableRow[] = [];
  const numInputs = inputPinIds.length;
  const combCount = 1 << numInputs;

  for (let mask = 0; mask < combCount; mask++) {
    const inputRow: Record<string, SignalValue> = {};
    const inputValues: SignalValue[] = [];

    for (let i = 0; i < numInputs; i++) {
      const bit = (mask >> (numInputs - 1 - i)) & 1;
      const sig = bit === 1 ? SignalValue.HIGH : SignalValue.LOW;
      inputRow[inputNames[i]] = sig;
      inputValues.push(sig);
    }

    const outputRow: Record<string, SignalValue> = {};

    if (wires.length > 0 || components.length > 1) {
      // Full circuit simulation
      const engine = new SimulationEngine(registry);
      engine.loadCircuit(components, wires);

      for (let i = 0; i < numInputs; i++) {
        engine.forcePinValue(inputPinIds[i], inputValues[i]);
      }

      for (let tick = 0; tick < 10; tick++) {
        engine.processTick();
      }

      for (let i = 0; i < outputPinIds.length; i++) {
        const outPinId = outputPinIds[i];
        outputRow[outputNames[i]] = engine.getPinValue(outPinId);
      }
    } else {
      // Single component direct evaluation
      for (const comp of components) {
        if (!registry.has(comp.type)) continue;
        const compInputValues = comp.pins
          .filter(p => p.direction === 'input')
          .map((_, i) => inputValues[i] ?? SignalValue.UNKNOWN);
        const compOutputs = registry.evaluate(comp.type, compInputValues, comp.properties);
        const outputPins = comp.pins.filter(p => p.direction === 'output');
        outputPins.forEach((pin, i) => {
          const idx = outputPinIds.indexOf(pin.id);
          if (idx >= 0) {
            outputRow[outputNames[idx]] = compOutputs[i] ?? SignalValue.UNKNOWN;
          }
        });
      }
    }

    rows.push({ inputs: inputRow, outputs: outputRow });
  }

  return { inputNames, outputNames, rows };
}

/**
 * Converts a TruthTableData to CSV string.
 */
export function exportTruthTableCSV(table: TruthTableData): string {
  const header = [...table.inputNames, ...table.outputNames].join(',');
  const rowLines = table.rows.map(row => {
    const inputVals = table.inputNames.map(n => signalToDisplay(row.inputs[n]));
    const outputVals = table.outputNames.map(n => signalToDisplay(row.outputs[n]));
    return [...inputVals, ...outputVals].join(',');
  });
  return [header, ...rowLines].join('\n');
}

function signalToDisplay(sig: SignalValue | undefined): string {
  switch (sig) {
    case SignalValue.HIGH: return '1';
    case SignalValue.LOW: return '0';
    case SignalValue.FLOATING: return 'Z';
    case SignalValue.ERROR: return 'E';
    default: return 'X';
  }
}
