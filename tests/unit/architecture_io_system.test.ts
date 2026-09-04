import { describe, it, expect } from 'vitest';
import { SimulationEngine, ComponentLogicRegistry, registerBuiltInLogics } from '@engine/simulation';
import { createComponent } from '@core/components/factory';
import { generateTruthTable } from '@engine/analysis/truthTable';
import { SignalValue } from '@apptypes/core';
import type { CircuitComponent, Wire } from '@apptypes/core';

describe('Advanced Input/Output & 4-Value Simulation System', () => {
  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  // ──────────────────────────────────────────────────────────────────────────
  describe('IEEE 4-Value Digital Logic Semantics', () => {
    it('AND gate respects dominating 0 with UNKNOWN / FLOATING signals', () => {
      // 0 AND UNKNOWN = 0
      const out1 = registry.evaluate('AND', [SignalValue.LOW, SignalValue.UNKNOWN]);
      expect(out1[0]).toBe(SignalValue.LOW);

      // 1 AND UNKNOWN = UNKNOWN
      const out2 = registry.evaluate('AND', [SignalValue.HIGH, SignalValue.UNKNOWN]);
      expect(out2[0]).toBe(SignalValue.UNKNOWN);

      // 0 AND FLOATING = 0
      const out3 = registry.evaluate('AND', [SignalValue.LOW, SignalValue.FLOATING]);
      expect(out3[0]).toBe(SignalValue.LOW);

      // 1 AND 1 = 1
      const out4 = registry.evaluate('AND', [SignalValue.HIGH, SignalValue.HIGH]);
      expect(out4[0]).toBe(SignalValue.HIGH);
    });

    it('OR gate respects dominating 1 with UNKNOWN / FLOATING signals', () => {
      // 1 OR UNKNOWN = 1
      const out1 = registry.evaluate('OR', [SignalValue.HIGH, SignalValue.UNKNOWN]);
      expect(out1[0]).toBe(SignalValue.HIGH);

      // 0 OR UNKNOWN = UNKNOWN
      const out2 = registry.evaluate('OR', [SignalValue.LOW, SignalValue.UNKNOWN]);
      expect(out2[0]).toBe(SignalValue.UNKNOWN);

      // 1 OR FLOATING = 1
      const out3 = registry.evaluate('OR', [SignalValue.HIGH, SignalValue.FLOATING]);
      expect(out3[0]).toBe(SignalValue.HIGH);

      // 0 OR 0 = 0
      const out4 = registry.evaluate('OR', [SignalValue.LOW, SignalValue.LOW]);
      expect(out4[0]).toBe(SignalValue.LOW);
    });

    it('NAND and NOR gates respect dominating inputs', () => {
      // 0 NAND UNKNOWN = 1
      expect(registry.evaluate('NAND', [SignalValue.LOW, SignalValue.UNKNOWN])[0]).toBe(SignalValue.HIGH);
      // 1 NAND UNKNOWN = UNKNOWN
      expect(registry.evaluate('NAND', [SignalValue.HIGH, SignalValue.UNKNOWN])[0]).toBe(SignalValue.UNKNOWN);

      // 1 NOR UNKNOWN = 0
      expect(registry.evaluate('NOR', [SignalValue.HIGH, SignalValue.UNKNOWN])[0]).toBe(SignalValue.LOW);
      // 0 NOR UNKNOWN = UNKNOWN
      expect(registry.evaluate('NOR', [SignalValue.LOW, SignalValue.UNKNOWN])[0]).toBe(SignalValue.UNKNOWN);
    });

    it('XOR and XNOR multi-input parity calculation', () => {
      // 3-input XOR (odd parity)
      expect(registry.evaluate('XOR', [SignalValue.LOW, SignalValue.LOW, SignalValue.LOW])[0]).toBe(SignalValue.LOW);
      expect(registry.evaluate('XOR', [SignalValue.HIGH, SignalValue.LOW, SignalValue.LOW])[0]).toBe(SignalValue.HIGH);
      expect(registry.evaluate('XOR', [SignalValue.HIGH, SignalValue.HIGH, SignalValue.LOW])[0]).toBe(SignalValue.LOW);
      expect(registry.evaluate('XOR', [SignalValue.HIGH, SignalValue.HIGH, SignalValue.HIGH])[0]).toBe(SignalValue.HIGH);

      // 3-input XNOR (even parity)
      expect(registry.evaluate('XNOR', [SignalValue.LOW, SignalValue.LOW, SignalValue.LOW])[0]).toBe(SignalValue.HIGH);
      expect(registry.evaluate('XNOR', [SignalValue.HIGH, SignalValue.LOW, SignalValue.LOW])[0]).toBe(SignalValue.LOW);
      expect(registry.evaluate('XNOR', [SignalValue.HIGH, SignalValue.HIGH, SignalValue.LOW])[0]).toBe(SignalValue.HIGH);
      expect(registry.evaluate('XNOR', [SignalValue.HIGH, SignalValue.HIGH, SignalValue.HIGH])[0]).toBe(SignalValue.LOW);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('Input Pin & Output Pin End-to-End Simulation', () => {
    it('simulates Input Pin -> XOR -> Output Pin circuit correctly', () => {
      const inA = createComponent('INPUT_PIN', 0, 0, { value: 0, label: 'A' });
      const inB = createComponent('INPUT_PIN', 0, 60, { value: 0, label: 'B' });
      const xorGate = createComponent('XOR', 100, 30);
      const outPin = createComponent('OUTPUT_PIN', 200, 30, { label: 'Y' });

      const pinAOut = inA.pins.find(p => p.direction === 'output')!;
      const pinBOut = inB.pins.find(p => p.direction === 'output')!;
      const xorIn1 = xorGate.pins[0];
      const xorIn2 = xorGate.pins[1];
      const xorOut = xorGate.pins.find(p => p.direction === 'output')!;
      const pinIn = outPin.pins.find(p => p.direction === 'input')!;

      const wires: Wire[] = [
        { id: 'w1', segments: [], fromPinId: pinAOut.id, toPinId: xorIn1.id, bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [] },
        { id: 'w2', segments: [], fromPinId: pinBOut.id, toPinId: xorIn2.id, bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [] },
        { id: 'w3', segments: [], fromPinId: xorOut.id, toPinId: pinIn.id, bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [] },
      ];

      const components = [inA, inB, xorGate, outPin];
      const engine = new SimulationEngine(registry);
      engine.loadCircuit(components, wires);

      // (A=0, B=0) -> Y=0
      engine.forcePinValue(pinAOut.id, SignalValue.LOW);
      engine.forcePinValue(pinBOut.id, SignalValue.LOW);
      engine.processTick();
      expect(engine.getPinValue(pinIn.id)).toBe(SignalValue.LOW);

      // (A=1, B=0) -> Y=1
      engine.forcePinValue(pinAOut.id, SignalValue.HIGH);
      engine.forcePinValue(pinBOut.id, SignalValue.LOW);
      engine.processTick();
      expect(engine.getPinValue(pinIn.id)).toBe(SignalValue.HIGH);

      // (A=0, B=1) -> Y=1
      engine.forcePinValue(pinAOut.id, SignalValue.LOW);
      engine.forcePinValue(pinBOut.id, SignalValue.HIGH);
      engine.processTick();
      expect(engine.getPinValue(pinIn.id)).toBe(SignalValue.HIGH);

      // (A=1, B=1) -> Y=0
      engine.forcePinValue(pinAOut.id, SignalValue.HIGH);
      engine.forcePinValue(pinBOut.id, SignalValue.HIGH);
      engine.processTick();
      expect(engine.getPinValue(pinIn.id)).toBe(SignalValue.LOW);
    });

    it('generates full truth table from circuit using live simulation engine', () => {
      const inA = createComponent('INPUT_PIN', 0, 0, { label: 'A' });
      const inB = createComponent('INPUT_PIN', 0, 60, { label: 'B' });
      const xorGate = createComponent('XOR', 100, 30);
      const outPin = createComponent('OUTPUT_PIN', 200, 30, { label: 'Y' });

      const pinAOut = inA.pins.find(p => p.direction === 'output')!;
      const pinBOut = inB.pins.find(p => p.direction === 'output')!;
      const xorIn1 = xorGate.pins[0];
      const xorIn2 = xorGate.pins[1];
      const xorOut = xorGate.pins.find(p => p.direction === 'output')!;
      const pinIn = outPin.pins.find(p => p.direction === 'input')!;

      const wires: Wire[] = [
        { id: 'w1', segments: [], fromPinId: pinAOut.id, toPinId: xorIn1.id, bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [] },
        { id: 'w2', segments: [], fromPinId: pinBOut.id, toPinId: xorIn2.id, bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [] },
        { id: 'w3', segments: [], fromPinId: xorOut.id, toPinId: pinIn.id, bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [] },
      ];

      const table = generateTruthTable(
        [pinAOut.id, pinBOut.id],
        [pinIn.id],
        ['A', 'B'],
        ['Y'],
        registry,
        [inA, inB, xorGate, outPin],
        wires
      );

      expect(table.rows.length).toBe(4);
      expect(table.rows[0].outputs['Y']).toBe(SignalValue.LOW);  // 0,0 -> 0
      expect(table.rows[1].outputs['Y']).toBe(SignalValue.HIGH); // 0,1 -> 1
      expect(table.rows[2].outputs['Y']).toBe(SignalValue.HIGH); // 1,0 -> 1
      expect(table.rows[3].outputs['Y']).toBe(SignalValue.LOW);  // 1,1 -> 0
    });
  });
});
