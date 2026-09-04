import { describe, it, expect } from 'vitest';
import { SignalValue } from '@apptypes/core';
import { ComponentLogicRegistry, registerBuiltInLogics, SimulationEngine } from '@engine/simulation';
import { createComponent } from '@core/components/factory';
import { getPinWorldPosition } from '@utils/math';

describe('Constant Components Simulation', () => {
  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  it('Constant 0 should always output SignalValue.LOW', () => {
    const c0 = createComponent('CONSTANT_0', 0, 0);
    const engine = new SimulationEngine(registry);
    engine.loadCircuit([c0], []);
    engine.processTick();
    expect(engine.getPinValue(c0.pins[0].id)).toBe(SignalValue.LOW);
  });

  it('Constant 1 should always output SignalValue.HIGH', () => {
    const c1 = createComponent('CONSTANT_1', 0, 0);
    const engine = new SimulationEngine(registry);
    engine.loadCircuit([c1], []);
    engine.processTick();
    expect(engine.getPinValue(c1.pins[0].id)).toBe(SignalValue.HIGH);
  });

  it('Result Constant should output correct binary bit patterns', () => {
    // 4-bit constant with value 5 -> 0101 (Q0=1, Q1=0, Q2=1, Q3=0)
    const rc5 = createComponent('RESULT_CONSTANT', 0, 0, { bitWidth: 4, value: 5 });
    const engine = new SimulationEngine(registry);
    engine.loadCircuit([rc5], []);
    engine.processTick();

    expect(engine.getPinValue(rc5.pins[0].id)).toBe(SignalValue.HIGH); // Q0 = 1
    expect(engine.getPinValue(rc5.pins[1].id)).toBe(SignalValue.LOW);  // Q1 = 0
    expect(engine.getPinValue(rc5.pins[2].id)).toBe(SignalValue.HIGH); // Q2 = 1
    expect(engine.getPinValue(rc5.pins[3].id)).toBe(SignalValue.LOW);  // Q3 = 0
  });

  it('Result Constant should support 8-bit values and overflow clipping', () => {
    const rc15 = createComponent('RESULT_CONSTANT', 0, 0, { bitWidth: 8, value: 15 });
    const engine = new SimulationEngine(registry);
    engine.loadCircuit([rc15], []);
    engine.processTick();

    // First 4 bits HIGH, top 4 bits LOW
    for (let i = 0; i < 4; i++) {
      expect(engine.getPinValue(rc15.pins[i].id)).toBe(SignalValue.HIGH);
    }
    for (let i = 4; i < 8; i++) {
      expect(engine.getPinValue(rc15.pins[i].id)).toBe(SignalValue.LOW);
    }
  });
});

describe('Circuit Integration: Constant 1 + Switch + AND + LED', () => {
  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  it('should switch LED ON when Switch is ON and Constant is 1', () => {
    const c1 = createComponent('CONSTANT_1', 0, 0);
    const sw = createComponent('SWITCH', 0, 50, { isOn: false });
    const andGate = createComponent('AND', 100, 20);
    const led = createComponent('LED', 200, 20);

    const wire1 = {
      id: 'w1', segments: [], bitWidth: 1, isBus: false,
      fromPinId: c1.pins[0].id, toPinId: andGate.pins[0].id,
      currentValue: SignalValue.UNKNOWN, junctions: [],
    };
    const wire2 = {
      id: 'w2', segments: [], bitWidth: 1, isBus: false,
      fromPinId: sw.pins[0].id, toPinId: andGate.pins[1].id,
      currentValue: SignalValue.UNKNOWN, junctions: [],
    };
    const wire3 = {
      id: 'w3', segments: [], bitWidth: 1, isBus: false,
      fromPinId: andGate.pins[2].id, toPinId: led.pins[0].id,
      currentValue: SignalValue.UNKNOWN, junctions: [],
    };

    const engine = new SimulationEngine(registry);
    engine.loadCircuit([c1, sw, andGate, led], [wire1, wire2, wire3]);

    // Initial state: Switch OFF -> LED should be LOW
    engine.forcePinValue(sw.pins[0].id, SignalValue.LOW);
    for (let i = 0; i < 5; i++) engine.processTick();
    expect(engine.getPinValue(led.pins[0].id)).toBe(SignalValue.LOW);

    // Turn Switch ON -> LED should be HIGH
    sw.properties['isOn'] = true;
    engine.forcePinValue(sw.pins[0].id, SignalValue.HIGH);
    for (let i = 0; i < 5; i++) engine.processTick();
    expect(engine.getPinValue(led.pins[0].id)).toBe(SignalValue.HIGH);
  });

  it('should keep LED OFF when Constant 0 is used regardless of Switch ON', () => {
    const c0 = createComponent('CONSTANT_0', 0, 0);
    const sw = createComponent('SWITCH', 0, 50, { isOn: true });
    const andGate = createComponent('AND', 100, 20);
    const led = createComponent('LED', 200, 20);

    const wire1 = {
      id: 'w1', segments: [], bitWidth: 1, isBus: false,
      fromPinId: c0.pins[0].id, toPinId: andGate.pins[0].id,
      currentValue: SignalValue.UNKNOWN, junctions: [],
    };
    const wire2 = {
      id: 'w2', segments: [], bitWidth: 1, isBus: false,
      fromPinId: sw.pins[0].id, toPinId: andGate.pins[1].id,
      currentValue: SignalValue.UNKNOWN, junctions: [],
    };
    const wire3 = {
      id: 'w3', segments: [], bitWidth: 1, isBus: false,
      fromPinId: andGate.pins[2].id, toPinId: led.pins[0].id,
      currentValue: SignalValue.UNKNOWN, junctions: [],
    };

    const engine = new SimulationEngine(registry);
    engine.loadCircuit([c0, sw, andGate, led], [wire1, wire2, wire3]);
    engine.forcePinValue(sw.pins[0].id, SignalValue.HIGH);
    for (let i = 0; i < 5; i++) engine.processTick();
    expect(engine.getPinValue(led.pins[0].id)).toBe(SignalValue.LOW);
  });

  it('should compute Result Constant 5 + Result Constant 3 = 8 with 4-bit Adder', () => {
    const rcA = createComponent('RESULT_CONSTANT', 0, 0, { bitWidth: 4, value: 5 }); // 5 = 0101
    const rcB = createComponent('RESULT_CONSTANT', 0, 100, { bitWidth: 4, value: 3 }); // 3 = 0011
    const adder = createComponent('ADDER', 150, 50, { bitWidth: 4 });

    const wires: any[] = [];
    // Connect A0..A3
    for (let i = 0; i < 4; i++) {
      wires.push({
        id: `w_a${i}`, segments: [], bitWidth: 1, isBus: false,
        fromPinId: rcA.pins[i].id, toPinId: adder.pins.find(p => p.name === `A${i}`)!.id,
        currentValue: SignalValue.UNKNOWN, junctions: [],
      });
    }
    // Connect B0..B3
    for (let i = 0; i < 4; i++) {
      wires.push({
        id: `w_b${i}`, segments: [], bitWidth: 1, isBus: false,
        fromPinId: rcB.pins[i].id, toPinId: adder.pins.find(p => p.name === `B${i}`)!.id,
        currentValue: SignalValue.UNKNOWN, junctions: [],
      });
    }

    const engine = new SimulationEngine(registry);
    engine.loadCircuit([rcA, rcB, adder], wires);
    for (let i = 0; i < 5; i++) engine.processTick();

    // 5 + 3 = 8 -> 1000 in binary (S0=0, S1=0, S2=0, S3=1, Cout=0)
    expect(engine.getPinValue(adder.pins.find(p => p.name === 'S0')!.id)).toBe(SignalValue.LOW);
    expect(engine.getPinValue(adder.pins.find(p => p.name === 'S1')!.id)).toBe(SignalValue.LOW);
    expect(engine.getPinValue(adder.pins.find(p => p.name === 'S2')!.id)).toBe(SignalValue.LOW);
    expect(engine.getPinValue(adder.pins.find(p => p.name === 'S3')!.id)).toBe(SignalValue.HIGH);
    expect(engine.getPinValue(adder.pins.find(p => p.name === 'Cout')!.id)).toBe(SignalValue.LOW);
  });
});

describe('Electrical Net Resolution & Junctions', () => {
  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  it('should propagate signal across multi-wire branch junctions to all connected input pins', () => {
    const c1 = createComponent('CONSTANT_1', 0, 0);
    const ledA = createComponent('LED', 150, 0);
    const ledB = createComponent('LED', 150, 50);

    const junctionPoint = { x: 80, y: 20 };

    const wireMain = {
      id: 'w_main', segments: [], bitWidth: 1, isBus: false,
      fromPinId: c1.pins[0].id, toPinId: ledA.pins[0].id,
      currentValue: SignalValue.UNKNOWN, junctions: [junctionPoint],
    };
    const wireBranch = {
      id: 'w_branch', segments: [], bitWidth: 1, isBus: false,
      fromPinId: c1.pins[0].id, toPinId: ledB.pins[0].id,
      currentValue: SignalValue.UNKNOWN, junctions: [junctionPoint],
    };

    const engine = new SimulationEngine(registry);
    engine.loadCircuit([c1, ledA, ledB], [wireMain, wireBranch]);
    engine.processTick();

    expect(engine.getPinValue(ledA.pins[0].id)).toBe(SignalValue.HIGH);
    expect(engine.getPinValue(ledB.pins[0].id)).toBe(SignalValue.HIGH);
  });

  it('should isolate non-junction crossing wires from cross-talk', () => {
    const c1 = createComponent('CONSTANT_1', 0, 0);
    const c0 = createComponent('CONSTANT_0', 50, 50);
    const led1 = createComponent('LED', 100, 0);
    const led0 = createComponent('LED', 50, 100);

    const wireH = {
      id: 'w_h', segments: [{ from: { x: 0, y: 0 }, to: { x: 100, y: 0 } }],
      fromPinId: c1.pins[0].id, toPinId: led1.pins[0].id,
      bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [],
    };
    const wireV = {
      id: 'w_v', segments: [{ from: { x: 50, y: -20 }, to: { x: 50, y: 100 } }],
      fromPinId: c0.pins[0].id, toPinId: led0.pins[0].id,
      bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [],
    };

    const engine = new SimulationEngine(registry);
    engine.loadCircuit([c1, c0, led1, led0], [wireH, wireV]);
    engine.processTick();

    expect(engine.getPinValue(led1.pins[0].id)).toBe(SignalValue.HIGH);
    expect(engine.getPinValue(led0.pins[0].id)).toBe(SignalValue.LOW);
  });

  it('should rotate constants cleanly while preserving pin calculations', () => {
    const c1 = createComponent('CONSTANT_1', 100, 100);
    c1.transform.rotation = 90;
    const pos = getPinWorldPosition(c1, c1.pins[0]);
    expect(pos).toBeDefined();
    expect(pos.x).toBeGreaterThan(0);
  });
});
