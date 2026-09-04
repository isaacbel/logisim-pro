import { describe, it, expect } from 'vitest';
import { SimulationEngine, ComponentLogicRegistry, registerBuiltInLogics } from '@engine/simulation';
import { createComponent } from '@core/components/factory';
import { SignalValue } from '@apptypes/core';
import type { Wire } from '@apptypes/core';

function makeWire(id: string, fromPinId: string, toPinId: string): Wire {
  return { id, segments: [], fromPinId, toPinId, bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [] };
}

describe('Real Circuit Integration Simulations', () => {
  const registry = new ComponentLogicRegistry();
  registerBuiltInLogics(registry);

  it('simulates Half Adder across all 4 input combinations', () => {
    const engine = new SimulationEngine(registry);
    const ha = createComponent('HALF_ADDER', 0, 0);
    const swA = createComponent('SWITCH', -50, 0);
    const swB = createComponent('SWITCH', -50, 20);

    const swAOut = swA.pins.find(p => p.direction === 'output')!;
    const swBOut = swB.pins.find(p => p.direction === 'output')!;
    const haA = ha.pins.find(p => p.name === 'A')!;
    const haB = ha.pins.find(p => p.name === 'B')!;
    const haS = ha.pins.find(p => p.name === 'S')!;
    const haC = ha.pins.find(p => p.name === 'C')!;

    engine.loadCircuit([ha, swA, swB], [
      makeWire('wA', swAOut.id, haA.id),
      makeWire('wB', swBOut.id, haB.id),
    ]);

    const truthTable = [
      { a: false, b: false, s: SignalValue.LOW, c: SignalValue.LOW },
      { a: false, b: true, s: SignalValue.HIGH, c: SignalValue.LOW },
      { a: true, b: false, s: SignalValue.HIGH, c: SignalValue.LOW },
      { a: true, b: true, s: SignalValue.LOW, c: SignalValue.HIGH },
    ];

    for (const row of truthTable) {
      swA.properties['isOn'] = row.a;
      swB.properties['isOn'] = row.b;
      engine.forcePinValue(swAOut.id, row.a ? SignalValue.HIGH : SignalValue.LOW);
      engine.forcePinValue(swBOut.id, row.b ? SignalValue.HIGH : SignalValue.LOW);
      for (let i = 0; i < 5; i++) engine.processTick();

      expect(engine.getAllPinValues().get(haS.id)).toBe(row.s);
      expect(engine.getAllPinValues().get(haC.id)).toBe(row.c);
    }
  });

  it('simulates Full Adder across combinations', () => {
    const engine = new SimulationEngine(registry);
    const fa = createComponent('FULL_ADDER', 0, 0);
    const swA = createComponent('SWITCH', -50, 0, { isOn: true });
    const swB = createComponent('SWITCH', -50, 20, { isOn: true });
    const swCin = createComponent('SWITCH', -50, 40, { isOn: true });

    const swAOut = swA.pins.find(p => p.direction === 'output')!;
    const swBOut = swB.pins.find(p => p.direction === 'output')!;
    const swCinOut = swCin.pins.find(p => p.direction === 'output')!;
    const faA = fa.pins.find(p => p.name === 'A')!;
    const faB = fa.pins.find(p => p.name === 'B')!;
    const faCin = fa.pins.find(p => p.name === 'Cin')!;
    const faS = fa.pins.find(p => p.name === 'S')!;
    const faCout = fa.pins.find(p => p.name === 'Cout')!;

    engine.loadCircuit([fa, swA, swB, swCin], [
      makeWire('wA', swAOut.id, faA.id),
      makeWire('wB', swBOut.id, faB.id),
      makeWire('wCin', swCinOut.id, faCin.id),
    ]);

    // 1 + 1 + 1 = 3 (Sum=1, Cout=1)
    for (let i = 0; i < 5; i++) engine.processTick();
    expect(engine.getAllPinValues().get(faS.id)).toBe(SignalValue.HIGH);
    expect(engine.getAllPinValues().get(faCout.id)).toBe(SignalValue.HIGH);
  });

  it('simulates Comparator (A>B, A=B, A<B)', () => {
    const engine = new SimulationEngine(registry);
    const cmp = createComponent('COMPARATOR', 0, 0, { bitWidth: 2 });
    // A=3 (A0=1, A1=1), B=2 (B0=0, B1=1)
    const swA0 = createComponent('SWITCH', -50, 0, { isOn: true });
    const swA1 = createComponent('SWITCH', -50, 20, { isOn: true });
    const swB0 = createComponent('SWITCH', -50, 40, { isOn: false });
    const swB1 = createComponent('SWITCH', -50, 60, { isOn: true });

    const a0Out = swA0.pins[0];
    const a1Out = swA1.pins[0];
    const b0Out = swB0.pins[0];
    const b1Out = swB1.pins[0];

    engine.loadCircuit([cmp, swA0, swA1, swB0, swB1], [
      makeWire('wA0', a0Out.id, cmp.pins.find(p => p.name === 'A0')!.id),
      makeWire('wA1', a1Out.id, cmp.pins.find(p => p.name === 'A1')!.id),
      makeWire('wB0', b0Out.id, cmp.pins.find(p => p.name === 'B0')!.id),
      makeWire('wB1', b1Out.id, cmp.pins.find(p => p.name === 'B1')!.id),
    ]);

    for (let i = 0; i < 5; i++) engine.processTick();

    const gtPin = cmp.pins.find(p => p.name === 'A>B')!;
    const eqPin = cmp.pins.find(p => p.name === 'A=B')!;
    const ltPin = cmp.pins.find(p => p.name === 'A<B')!;

    // 3 > 2
    expect(engine.getAllPinValues().get(gtPin.id)).toBe(SignalValue.HIGH);
    expect(engine.getAllPinValues().get(eqPin.id)).toBe(SignalValue.LOW);
    expect(engine.getAllPinValues().get(ltPin.id)).toBe(SignalValue.LOW);
  });

  it('simulates Synchronous Counter counting on clock edges', () => {
    const engine = new SimulationEngine(registry);
    const ctr = createComponent('COUNTER', 0, 0, { bitWidth: 4 });
    const clk = createComponent('CLOCK', -50, 0, { state: false });
    const clkOut = clk.pins[0];

    engine.loadCircuit([ctr, clk], [
      makeWire('wClk', clkOut.id, ctr.pins.find(p => p.name === 'CLK')!.id),
    ]);

    // Initial count is 0
    for (let i = 0; i < 3; i++) engine.processTick();
    const q0 = ctr.pins.find(p => p.name === 'Q0')!;
    const q1 = ctr.pins.find(p => p.name === 'Q1')!;
    expect(engine.getAllPinValues().get(q0.id)).toBe(SignalValue.LOW);
    expect(engine.getAllPinValues().get(q1.id)).toBe(SignalValue.LOW);

    // Pulse clock: rising edge (LOW -> HIGH)
    clk.properties['state'] = true;
    engine.forcePinValue(clkOut.id, SignalValue.HIGH);
    for (let i = 0; i < 3; i++) engine.processTick();

    // Count should increment to 1 (Q0=1, Q1=0)
    expect(engine.getAllPinValues().get(q0.id)).toBe(SignalValue.HIGH);
    expect(engine.getAllPinValues().get(q1.id)).toBe(SignalValue.LOW);

    // Clock return to LOW
    clk.properties['state'] = false;
    engine.forcePinValue(clkOut.id, SignalValue.LOW);
    for (let i = 0; i < 3; i++) engine.processTick();

    // Pulse clock again: count should increment to 2 (Q0=0, Q1=1)
    clk.properties['state'] = true;
    engine.forcePinValue(clkOut.id, SignalValue.HIGH);
    for (let i = 0; i < 3; i++) engine.processTick();

    expect(engine.getAllPinValues().get(q0.id)).toBe(SignalValue.LOW);
    expect(engine.getAllPinValues().get(q1.id)).toBe(SignalValue.HIGH);
  });

  it('simulates D-Latch transparent and latched states', () => {
    const engine = new SimulationEngine(registry);
    const dlatch = createComponent('D_LATCH', 0, 0);
    const swD = createComponent('SWITCH', -50, 0, { isOn: true });
    const swEN = createComponent('SWITCH', -50, 20, { isOn: true });

    const swDOut = swD.pins[0];
    const swENOut = swEN.pins[0];
    const dPin = dlatch.pins.find(p => p.name === 'D')!;
    const enPin = dlatch.pins.find(p => p.name === 'EN')!;
    const qPin = dlatch.pins.find(p => p.name === 'Q')!;
    const qBarPin = dlatch.pins.find(p => p.name === 'Q̅')!;

    engine.loadCircuit([dlatch, swD, swEN], [
      makeWire('wD', swDOut.id, dPin.id),
      makeWire('wEN', swENOut.id, enPin.id),
    ]);

    // EN=1, D=1 -> Q=1, Q̅=0
    for (let i = 0; i < 3; i++) engine.processTick();
    expect(engine.getAllPinValues().get(qPin.id)).toBe(SignalValue.HIGH);
    expect(engine.getAllPinValues().get(qBarPin.id)).toBe(SignalValue.LOW);

    // Latch: EN=0
    swEN.properties['isOn'] = false;
    engine.forcePinValue(swENOut.id, SignalValue.LOW);
    for (let i = 0; i < 3; i++) engine.processTick();

    // Now change D to 0 while latched: Q should HOLD 1!
    swD.properties['isOn'] = false;
    engine.forcePinValue(swDOut.id, SignalValue.LOW);
    for (let i = 0; i < 3; i++) engine.processTick();

    expect(engine.getAllPinValues().get(qPin.id)).toBe(SignalValue.HIGH);
    expect(engine.getAllPinValues().get(qBarPin.id)).toBe(SignalValue.LOW);
  });

  it('simulates ROM reading data by address', () => {
    const engine = new SimulationEngine(registry);
    const rom = createComponent('ROM', 0, 0, {
      addrWidth: 2,
      dataWidth: 4,
      romData: [0xA, 0x5, 0xF, 0x3],
    });

    // Address = 1 (A0=1, A1=0) -> should read 0x5 = 0b0101 (Q0=1, Q1=0, Q2=1, Q3=0)
    const swA0 = createComponent('SWITCH', -50, 0, { isOn: true });
    const swA1 = createComponent('SWITCH', -50, 20, { isOn: false });

    engine.loadCircuit([rom, swA0, swA1], [
      makeWire('wA0', swA0.pins[0].id, rom.pins.find(p => p.name === 'A0')!.id),
      makeWire('wA1', swA1.pins[0].id, rom.pins.find(p => p.name === 'A1')!.id),
    ]);

    for (let i = 0; i < 5; i++) engine.processTick();

    const q0 = rom.pins.find(p => p.name === 'Q0')!;
    const q1 = rom.pins.find(p => p.name === 'Q1')!;
    const q2 = rom.pins.find(p => p.name === 'Q2')!;
    const q3 = rom.pins.find(p => p.name === 'Q3')!;

    expect(engine.getAllPinValues().get(q0.id)).toBe(SignalValue.HIGH); // 1
    expect(engine.getAllPinValues().get(q1.id)).toBe(SignalValue.LOW);  // 0
    expect(engine.getAllPinValues().get(q2.id)).toBe(SignalValue.HIGH); // 1
    expect(engine.getAllPinValues().get(q3.id)).toBe(SignalValue.LOW);  // 0
  });
});
