import { describe, it, expect } from 'vitest';
import { createComponent, createPins } from '@core/components/factory';

describe('Component Factory Pins Schema & Geometry', () => {
  it('creates authoritative pins for basic gates', () => {
    const andComp = createComponent('AND', 0, 0);
    expect(andComp.pins).toHaveLength(3); // 2 in, 1 out
    expect(andComp.pins[0].name).toBe('A');
    expect(andComp.pins[1].name).toBe('B');
    expect(andComp.pins[2].name).toBe('Y');

    const notComp = createComponent('NOT', 0, 0);
    expect(notComp.pins).toHaveLength(2); // 1 in, 1 out
  });

  it('creates authoritative pins and bounds for arithmetic components', () => {
    const ha = createComponent('HALF_ADDER', 0, 0);
    expect(ha.pins.map(p => p.name)).toEqual(['A', 'B', 'S', 'C']);
    expect(ha.bounds.width).toBe(50);
    expect(ha.bounds.height).toBe(50);

    const fa = createComponent('FULL_ADDER', 0, 0);
    expect(fa.pins.map(p => p.name)).toEqual(['A', 'B', 'Cin', 'S', 'Cout']);
    expect(fa.bounds.width).toBe(50);
    expect(fa.bounds.height).toBe(60);

    const adder4 = createComponent('ADDER', 0, 0, { bitWidth: 4 });
    expect(adder4.pins).toHaveLength(14); // 4 A, 4 B, Cin, 4 S, Cout
    expect(adder4.bounds.width).toBe(60);

    const addSub = createComponent('ADDER_SUBTRACTOR', 0, 0, { bitWidth: 4 });
    expect(addSub.pins.map(p => p.name)).toContain('SUB');
    expect(addSub.pins.map(p => p.name)).toContain('Cin');
    expect(addSub.pins.map(p => p.name)).toContain('Cout');

    const cmp = createComponent('COMPARATOR', 0, 0, { bitWidth: 4 });
    expect(cmp.pins.map(p => p.name)).toEqual([
      'A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'A>B', 'A=B', 'A<B'
    ]);

    const alu = createComponent('ALU', 0, 0, { bitWidth: 4 });
    expect(alu.pins.map(p => p.name)).toContain('OP0');
    expect(alu.pins.map(p => p.name)).toContain('ZERO');
    expect(alu.pins.map(p => p.name)).toContain('NEG');
    expect(alu.bounds.width).toBe(70);
  });

  it('creates authoritative pins for multiplexers & decoders', () => {
    const mux1 = createComponent('MULTIPLEXER', 0, 0, { selBits: 1 });
    expect(mux1.pins.map(p => p.name)).toEqual(['D0', 'D1', 'S0', 'Y']);

    const mux2 = createComponent('MULTIPLEXER', 0, 0, { selBits: 2 });
    expect(mux2.pins.map(p => p.name)).toEqual(['D0', 'D1', 'D2', 'D3', 'S0', 'S1', 'Y']);

    const demux = createComponent('DEMULTIPLEXER', 0, 0, { selBits: 2 });
    expect(demux.pins.map(p => p.name)).toEqual(['A', 'S0', 'S1', 'Y0', 'Y1', 'Y2', 'Y3']);

    const enc = createComponent('ENCODER', 0, 0, { bitWidth: 2 });
    expect(enc.pins.map(p => p.name)).toEqual(['D0', 'D1', 'D2', 'D3', 'Y0', 'Y1']);

    const dec = createComponent('DECODER', 0, 0, { bitWidth: 2 });
    expect(dec.pins.map(p => p.name)).toEqual(['A0', 'A1', 'EN', 'Y0', 'Y1', 'Y2', 'Y3']);
  });

  it('creates authoritative pins for sequential and memory components', () => {
    const sr = createComponent('SR_LATCH', 0, 0);
    expect(sr.pins.map(p => p.name)).toEqual(['S', 'R', 'Q', 'Q̅']);

    const dlatch = createComponent('D_LATCH', 0, 0);
    expect(dlatch.pins.map(p => p.name)).toEqual(['D', 'EN', 'Q', 'Q̅']);

    const dff = createComponent('D_FLIPFLOP', 0, 0);
    expect(dff.pins.map(p => p.name)).toEqual(['D', 'CLK', 'RST', 'PRE', 'Q', 'Q̅']);

    const jk = createComponent('JK_FLIPFLOP', 0, 0);
    expect(jk.pins.map(p => p.name)).toEqual(['J', 'CLK', 'K', 'Q', 'Q̅']);

    const tff = createComponent('T_FLIPFLOP', 0, 0);
    expect(tff.pins.map(p => p.name)).toEqual(['T', 'CLK', 'Q', 'Q̅']);

    const reg = createComponent('REGISTER', 0, 0, { bitWidth: 4 });
    expect(reg.pins.map(p => p.name)).toEqual(['D0', 'D1', 'D2', 'D3', 'CLK', 'EN', 'Q0', 'Q1', 'Q2', 'Q3']);

    const ctr = createComponent('COUNTER', 0, 0, { bitWidth: 4 });
    expect(ctr.pins.map(p => p.name)).toEqual(['CLK', 'EN', 'RST', 'UP', 'Q0', 'Q1', 'Q2', 'Q3']);

    const ram = createComponent('RAM', 0, 0, { addrWidth: 4, dataWidth: 4 });
    expect(ram.pins.map(p => p.name)).toContain('WE');
    expect(ram.pins.map(p => p.name)).toContain('OE');
    expect(ram.pins.map(p => p.name)).toContain('CLK');

    const rom = createComponent('ROM', 0, 0, { addrWidth: 4, dataWidth: 4 });
    expect(rom.pins.map(p => p.name)).toEqual(['A0', 'A1', 'A2', 'A3', 'Q0', 'Q1', 'Q2', 'Q3']);
  });
});
