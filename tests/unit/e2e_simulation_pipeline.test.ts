import { describe, it, expect } from 'vitest';
import { SimulationEngine, ComponentLogicRegistry, registerBuiltInLogics } from '../../src/engine/simulation';
import { createComponent } from '../../src/core/components/factory';
import { SignalValue } from '../../src/types/core';
import type { Wire, CircuitComponent } from '../../src/types/core';
import { serializeProject, parseProject } from '../../src/services/ProjectStorage';
import { nanoid } from 'nanoid';

function makeWire(fromPinId: string, toPinId: string): Wire {
  return {
    id: nanoid(),
    segments: [],
    fromPinId,
    toPinId,
    bitWidth: 1,
    isBus: false,
    currentValue: SignalValue.UNKNOWN,
    junctions: [],
  };
}

describe('End-to-End Simulation Pipeline Verification', () => {
  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  it('TEST 1: Constant 1 -> LED propagates HIGH to LED input pin', () => {
    const engine = new SimulationEngine(registry);
    const const1 = createComponent('CONSTANT_1', 0, 0);
    const led = createComponent('LED', 100, 0);

    const constOut = const1.pins.find(p => p.direction === 'output')!;
    const ledIn = led.pins.find(p => p.direction === 'input')!;
    const wire = makeWire(constOut.id, ledIn.id);

    engine.loadCircuit([const1, led], [wire]);
    engine.processTick();

    expect(engine.getPinValue(constOut.id)).toBe(SignalValue.HIGH);
    expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.HIGH);
    expect(engine.getWireValue(wire.id)).toBe(SignalValue.HIGH);
  });

  it('TEST 2: Constant 0 -> LED propagates LOW to LED input pin', () => {
    const engine = new SimulationEngine(registry);
    const const0 = createComponent('CONSTANT_0', 0, 0);
    const led = createComponent('LED', 100, 0);

    const constOut = const0.pins.find(p => p.direction === 'output')!;
    const ledIn = led.pins.find(p => p.direction === 'input')!;
    const wire = makeWire(constOut.id, ledIn.id);

    engine.loadCircuit([const0, led], [wire]);
    engine.processTick();

    expect(engine.getPinValue(constOut.id)).toBe(SignalValue.LOW);
    expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.LOW);
    expect(engine.getWireValue(wire.id)).toBe(SignalValue.LOW);
  });

  it('TEST 3: Constant 1 + Constant 1 -> AND -> LED produces HIGH / ON', () => {
    const engine = new SimulationEngine(registry);
    const c1a = createComponent('CONSTANT_1', 0, 0);
    const c1b = createComponent('CONSTANT_1', 0, 40);
    const and = createComponent('AND', 100, 20);
    const led = createComponent('LED', 200, 20);

    const c1aOut = c1a.pins.find(p => p.direction === 'output')!;
    const c1bOut = c1b.pins.find(p => p.direction === 'output')!;
    const andInA = and.pins.find(p => p.name === 'A')!;
    const andInB = and.pins.find(p => p.name === 'B')!;
    const andOut = and.pins.find(p => p.direction === 'output')!;
    const ledIn = led.pins.find(p => p.direction === 'input')!;

    const w1 = makeWire(c1aOut.id, andInA.id);
    const w2 = makeWire(c1bOut.id, andInB.id);
    const w3 = makeWire(andOut.id, ledIn.id);

    engine.loadCircuit([c1a, c1b, and, led], [w1, w2, w3]);
    engine.processTick();

    expect(engine.getPinValue(andOut.id)).toBe(SignalValue.HIGH);
    expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.HIGH);
    expect(engine.getWireValue(w3.id)).toBe(SignalValue.HIGH);
  });

  it('TEST 4: Constant 1 + Constant 0 -> AND -> LED produces LOW / OFF', () => {
    const engine = new SimulationEngine(registry);
    const c1 = createComponent('CONSTANT_1', 0, 0);
    const c0 = createComponent('CONSTANT_0', 0, 40);
    const and = createComponent('AND', 100, 20);
    const led = createComponent('LED', 200, 20);

    const c1Out = c1.pins.find(p => p.direction === 'output')!;
    const c0Out = c0.pins.find(p => p.direction === 'output')!;
    const andInA = and.pins.find(p => p.name === 'A')!;
    const andInB = and.pins.find(p => p.name === 'B')!;
    const andOut = and.pins.find(p => p.direction === 'output')!;
    const ledIn = led.pins.find(p => p.direction === 'input')!;

    const w1 = makeWire(c1Out.id, andInA.id);
    const w2 = makeWire(c0Out.id, andInB.id);
    const w3 = makeWire(andOut.id, ledIn.id);

    engine.loadCircuit([c1, c0, and, led], [w1, w2, w3]);
    engine.processTick();

    expect(engine.getPinValue(andOut.id)).toBe(SignalValue.LOW);
    expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.LOW);
    expect(engine.getWireValue(w3.id)).toBe(SignalValue.LOW);
  });

  it('TEST 5: XOR truth table across all 4 combinations (00->0, 01->1, 10->1, 11->0)', () => {
    const engine = new SimulationEngine(registry);
    const swA = createComponent('SWITCH', 0, 0);
    const swB = createComponent('SWITCH', 0, 40);
    const xor = createComponent('XOR', 100, 20);
    const led = createComponent('LED', 200, 20);

    const swAOut = swA.pins.find(p => p.direction === 'output')!;
    const swBOut = swB.pins.find(p => p.direction === 'output')!;
    const xorA = xor.pins.find(p => p.name === 'A')!;
    const xorB = xor.pins.find(p => p.name === 'B')!;
    const xorOut = xor.pins.find(p => p.direction === 'output')!;
    const ledIn = led.pins.find(p => p.direction === 'input')!;

    engine.loadCircuit([swA, swB, xor, led], [
      makeWire(swAOut.id, xorA.id),
      makeWire(swBOut.id, xorB.id),
      makeWire(xorOut.id, ledIn.id),
    ]);

    const cases = [
      { a: false, b: false, expected: SignalValue.LOW },
      { a: false, b: true,  expected: SignalValue.HIGH },
      { a: true,  b: false, expected: SignalValue.HIGH },
      { a: true,  b: true,  expected: SignalValue.LOW },
    ];

    for (const c of cases) {
      engine.forcePinValue(swAOut.id, c.a ? SignalValue.HIGH : SignalValue.LOW);
      engine.forcePinValue(swBOut.id, c.b ? SignalValue.HIGH : SignalValue.LOW);
      engine.processTick();
      expect(engine.getPinValue(xorOut.id)).toBe(c.expected);
      expect(engine.getPinValue(ledIn.id)).toBe(c.expected);
    }
  });

  it('TEST 6: Half Adder (A=1, B=1 -> Sum=0, Carry=1)', () => {
    const engine = new SimulationEngine(registry);
    const cA = createComponent('CONSTANT_1', 0, 0);
    const cB = createComponent('CONSTANT_1', 0, 30);
    const ha = createComponent('HALF_ADDER', 80, 10);
    const ledSum = createComponent('LED', 180, 0);
    const ledCarry = createComponent('LED', 180, 40);

    const aOut = cA.pins.find(p => p.direction === 'output')!;
    const bOut = cB.pins.find(p => p.direction === 'output')!;
    const haA = ha.pins.find(p => p.name === 'A')!;
    const haB = ha.pins.find(p => p.name === 'B')!;
    const haS = ha.pins.find(p => p.name === 'S')!;
    const haC = ha.pins.find(p => p.name === 'C')!;
    const sumIn = ledSum.pins.find(p => p.direction === 'input')!;
    const carryIn = ledCarry.pins.find(p => p.direction === 'input')!;

    engine.loadCircuit([cA, cB, ha, ledSum, ledCarry], [
      makeWire(aOut.id, haA.id),
      makeWire(bOut.id, haB.id),
      makeWire(haS.id, sumIn.id),
      makeWire(haC.id, carryIn.id),
    ]);

    engine.processTick();

    expect(engine.getPinValue(sumIn.id)).toBe(SignalValue.LOW);
    expect(engine.getPinValue(carryIn.id)).toBe(SignalValue.HIGH);
  });

  it('TEST 7 & 8: Clock -> D Flip-Flop -> LED updates on clock edge', () => {
    const engine = new SimulationEngine(registry);
    const swD = createComponent('SWITCH', 0, 0);
    const clk = createComponent('CLOCK', 0, 40);
    const dff = createComponent('D_FLIPFLOP', 100, 20);
    const ledQ = createComponent('LED', 200, 20);

    const swDOut = swD.pins.find(p => p.direction === 'output')!;
    const clkOut = clk.pins.find(p => p.direction === 'output')!;
    const dffD = dff.pins.find(p => p.name === 'D')!;
    const dffClk = dff.pins.find(p => p.name === 'CLK')!;
    const dffQ = dff.pins.find(p => p.name === 'Q')!;
    const ledIn = ledQ.pins.find(p => p.direction === 'input')!;

    engine.loadCircuit([swD, clk, dff, ledQ], [
      makeWire(swDOut.id, dffD.id),
      makeWire(clkOut.id, dffClk.id),
      makeWire(dffQ.id, ledIn.id),
    ]);

    // Initial state: D=LOW, CLK=LOW -> Q=LOW
    engine.forcePinValue(swDOut.id, SignalValue.LOW);
    engine.forcePinValue(clkOut.id, SignalValue.LOW);
    engine.processTick();
    expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.LOW);

    // Set D=HIGH, CLK still LOW -> Q should remain LOW (not latched yet)
    engine.forcePinValue(swDOut.id, SignalValue.HIGH);
    engine.processTick();
    expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.LOW);

    // Rising edge: CLK=HIGH -> Q latches HIGH
    engine.forcePinValue(clkOut.id, SignalValue.HIGH);
    engine.processTick();
    expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.HIGH);

    // Change D to LOW while CLK is HIGH -> Q remains HIGH until next rising edge
    engine.forcePinValue(swDOut.id, SignalValue.LOW);
    engine.processTick();
    expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.HIGH);
  });

  it('TEST 9: Adding unrelated component does not change existing wires or simulation values', () => {
    const engine = new SimulationEngine(registry);
    const c1 = createComponent('CONSTANT_1', 0, 0);
    const led = createComponent('LED', 100, 0);
    const c1Out = c1.pins.find(p => p.direction === 'output')!;
    const ledIn = led.pins.find(p => p.direction === 'input')!;
    const wire = makeWire(c1Out.id, ledIn.id);

    const components: CircuitComponent[] = [c1, led];
    const wires: Wire[] = [wire];

    engine.loadCircuit(components, wires);
    engine.processTick();
    expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.HIGH);

    // Add 10 unrelated gates to the circuit
    const types = ['AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR', 'MUX', 'RAM', 'ALU'] as const;
    for (let i = 0; i < types.length; i++) {
      components.push(createComponent(types[i], 300 + i * 20, 300));
      engine.loadCircuit(components, wires);
      engine.processTick();
      expect(engine.getPinValue(ledIn.id)).toBe(SignalValue.HIGH);
      expect(wires).toHaveLength(1);
    }
  });

  it('TEST 10: Save / load serialization preserves circuit and simulation behavior', () => {
    const c1 = createComponent('CONSTANT_1', 10, 20);
    const c0 = createComponent('CONSTANT_0', 10, 80);
    const and = createComponent('AND', 100, 50);
    const led = createComponent('LED', 200, 50);

    const c1Out = c1.pins.find(p => p.direction === 'output')!;
    const c0Out = c0.pins.find(p => p.direction === 'output')!;
    const andInA = and.pins.find(p => p.name === 'A')!;
    const andInB = and.pins.find(p => p.name === 'B')!;
    const andOut = and.pins.find(p => p.direction === 'output')!;
    const ledIn = led.pins.find(p => p.direction === 'input')!;

    const w1 = makeWire(c1Out.id, andInA.id);
    const w2 = makeWire(c0Out.id, andInB.id);
    const w3 = makeWire(andOut.id, ledIn.id);

    const project = {
      id: 'proj_test',
      name: 'Test Circuit Project',
      version: '1.0.0',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      circuits: [
        {
          id: 'main',
          name: 'Main',
          components: [c1, c0, and, led],
          wires: [w1, w2, w3],
        },
      ],
    };

    const viewport = {
      transform: { x: 0, y: 0, scale: 1 },
      gridSize: 10,
      gridVisible: true,
      snapToGrid: true,
      width: 800,
      height: 600,
    };

    // Serialize
    const json = serializeProject(project, [], viewport);
    expect(json).toBeTruthy();

    // Parse
    const restored = parseProject(json);
    expect(restored.project.circuits[0].components).toHaveLength(4);
    expect(restored.project.circuits[0].wires).toHaveLength(3);

    // Simulate restored circuit
    const engine = new SimulationEngine(registry);
    engine.loadCircuit(restored.project.circuits[0].components, restored.project.circuits[0].wires);
    engine.processTick();

    const restoredAndOut = restored.project.circuits[0].components.find(c => c.type === 'AND')!.pins.find(p => p.direction === 'output')!;
    const restoredLedIn = restored.project.circuits[0].components.find(c => c.type === 'LED')!.pins.find(p => p.direction === 'input')!;

    // 1 AND 0 = 0
    expect(engine.getPinValue(restoredAndOut.id)).toBe(SignalValue.LOW);
    expect(engine.getPinValue(restoredLedIn.id)).toBe(SignalValue.LOW);
  });
});
