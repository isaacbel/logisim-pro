/**
 * REGRESSION: Wire Persistence
 * Root cause fixed:
 *   updateComponentProperty() had:
 *     circ.wires.filter(w => nextPinIds.has(w.fromPinId) && nextPinIds.has(w.toPinId))
 *   where nextPinIds = ONLY the updated component's pins.
 *   A wire always connects two DIFFERENT components, so this deleted every wire.
 * Fix: filter against ALL pin IDs across ALL components in the circuit.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/state/store';
import { createComponent } from '../../src/core/components/factory';
import { nanoid } from 'nanoid';
import type { Wire } from '../../src/types/core';
import { SignalValue } from '../../src/types/core';

function getCircuit() {
  const s = useAppStore.getState();
  return s.project!.circuits.find(c => c.id === s.currentCircuitId)!;
}

function makeWire(fromPinId: string, toPinId: string): Wire {
  return { id: nanoid(), segments: [], fromPinId, toPinId, bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [] };
}

beforeEach(() => { useAppStore.getState().newProject(); });

describe('Wire Persistence - addComponent', () => {
  it('adding a gate does NOT remove existing wires', () => {
    const sw  = createComponent('SWITCH', 0, 0);
    const and = createComponent('AND',   100, 0);
    const led = createComponent('LED',   200, 0);
    const s   = useAppStore.getState();
    s.addComponent(sw); s.addComponent(and); s.addComponent(led);
    const c0   = getCircuit();
    const swO  = c0.components.find(x => x.id === sw.id)!.pins.find(p => p.direction === 'output')!;
    const andA = c0.components.find(x => x.id === and.id)!.pins.find(p => p.name === 'A')!;
    const andO = c0.components.find(x => x.id === and.id)!.pins.find(p => p.direction === 'output')!;
    const ledI = c0.components.find(x => x.id === led.id)!.pins.find(p => p.direction === 'input')!;
    const w1 = makeWire(swO.id, andA.id);
    const w2 = makeWire(andO.id, ledI.id);
    s.addWire(w1); s.addWire(w2);
    expect(getCircuit().wires).toHaveLength(2);
    const origIds = [w1.id, w2.id];
    const types: string[] = ['OR','NOT','XOR','NAND','NOR','XNOR','MUX','AND','LED','SWITCH'];
    for (const type of types) {
      s.addComponent(createComponent(type, 400, 400));
      const circ = getCircuit();
      expect(circ.wires).toHaveLength(2);
      expect(circ.wires.map(w => w.id)).toEqual(origIds);
    }
  });

  it('stress: 50 component additions leave wire stable', () => {
    const sw  = createComponent('SWITCH', 0, 0);
    const led = createComponent('LED', 200, 0);
    const s   = useAppStore.getState();
    s.addComponent(sw); s.addComponent(led);
    const c0  = getCircuit();
    const swO = c0.components.find(x => x.id === sw.id)!.pins.find(p => p.direction === 'output')!;
    const ledI = c0.components.find(x => x.id === led.id)!.pins.find(p => p.direction === 'input')!;
    const wire = makeWire(swO.id, ledI.id);
    s.addWire(wire);
    const types: string[] = ['AND','OR','NOT','XOR','NAND','NOR','MUX','LED','SWITCH','CONSTANT_0'];
    for (let i = 0; i < 50; i++) {
      s.addComponent(createComponent(types[i % types.length], 400 + i * 10, 400));
      const circ = getCircuit();
      expect(circ.wires).toHaveLength(1);
      expect(circ.wires[0].id).toBe(wire.id);
      expect(circ.wires[0].fromPinId).toBe(swO.id);
      expect(circ.wires[0].toPinId).toBe(ledI.id);
    }
  });
});

describe('Wire Persistence - updateComponentProperty', () => {
  it('toggling a Switch does NOT delete wires to other components', () => {
    const sw  = createComponent('SWITCH', 0, 0);
    const and = createComponent('AND', 100, 0);
    const led = createComponent('LED', 200, 0);
    const s   = useAppStore.getState();
    s.addComponent(sw); s.addComponent(and); s.addComponent(led);
    const c0   = getCircuit();
    const swO  = c0.components.find(x => x.id === sw.id)!.pins.find(p => p.direction === 'output')!;
    const andA = c0.components.find(x => x.id === and.id)!.pins.find(p => p.name === 'A')!;
    const andO = c0.components.find(x => x.id === and.id)!.pins.find(p => p.direction === 'output')!;
    const ledI = c0.components.find(x => x.id === led.id)!.pins.find(p => p.direction === 'input')!;
    s.addWire(makeWire(swO.id, andA.id));
    s.addWire(makeWire(andO.id, ledI.id));
    expect(getCircuit().wires).toHaveLength(2);
    for (let i = 0; i < 20; i++) {
      s.updateComponentProperty(sw.id, 'isOn', i % 2 === 0);
      expect(getCircuit().wires).toHaveLength(2);
    }
  });

  it('updating label does NOT delete wires', () => {
    const sw  = createComponent('SWITCH', 0, 0);
    const led = createComponent('LED', 200, 0);
    const s   = useAppStore.getState();
    s.addComponent(sw); s.addComponent(led);
    const c0  = getCircuit();
    const swO = c0.components.find(x => x.id === sw.id)!.pins.find(p => p.direction === 'output')!;
    const ledI = c0.components.find(x => x.id === led.id)!.pins.find(p => p.direction === 'input')!;
    const wire = makeWire(swO.id, ledI.id);
    s.addWire(wire);
    s.updateComponentLabel(sw.id, 'My Switch');
    expect(getCircuit().wires).toHaveLength(1);
    expect(getCircuit().wires[0].id).toBe(wire.id);
  });
});

describe('Wire Persistence - move / rotate / delete unrelated component', () => {
  it('moving unrelated component does NOT remove wires', () => {
    const sw = createComponent('SWITCH', 0, 0);
    const led = createComponent('LED', 200, 0);
    const other = createComponent('OR', 600, 600);
    const s = useAppStore.getState();
    s.addComponent(sw); s.addComponent(led); s.addComponent(other);
    const c0 = getCircuit();
    const swO = c0.components.find(x => x.id === sw.id)!.pins.find(p => p.direction === 'output')!;
    const ledI = c0.components.find(x => x.id === led.id)!.pins.find(p => p.direction === 'input')!;
    const wire = makeWire(swO.id, ledI.id);
    s.addWire(wire);
    s.moveComponent(other.id, 700, 700);
    expect(getCircuit().wires).toHaveLength(1);
    expect(getCircuit().wires[0].id).toBe(wire.id);
  });

  it('rotating unrelated component does NOT remove wires', () => {
    const sw = createComponent('SWITCH', 0, 0);
    const led = createComponent('LED', 200, 0);
    const other = createComponent('OR', 600, 600);
    const s = useAppStore.getState();
    s.addComponent(sw); s.addComponent(led); s.addComponent(other);
    const c0 = getCircuit();
    const swO = c0.components.find(x => x.id === sw.id)!.pins.find(p => p.direction === 'output')!;
    const ledI = c0.components.find(x => x.id === led.id)!.pins.find(p => p.direction === 'input')!;
    const wire = makeWire(swO.id, ledI.id);
    s.addWire(wire);
    s.rotateComponent(other.id, 90);
    expect(getCircuit().wires).toHaveLength(1);
    expect(getCircuit().wires[0].id).toBe(wire.id);
  });

  it('deleting unrelated component does NOT remove wires between remaining components', () => {
    const sw = createComponent('SWITCH', 0, 0);
    const led = createComponent('LED', 200, 0);
    const other = createComponent('OR', 600, 600);
    const s = useAppStore.getState();
    s.addComponent(sw); s.addComponent(led); s.addComponent(other);
    const c0 = getCircuit();
    const swO = c0.components.find(x => x.id === sw.id)!.pins.find(p => p.direction === 'output')!;
    const ledI = c0.components.find(x => x.id === led.id)!.pins.find(p => p.direction === 'input')!;
    const wire = makeWire(swO.id, ledI.id);
    s.addWire(wire);
    s.removeComponent(other.id);
    expect(getCircuit().wires).toHaveLength(1);
    expect(getCircuit().wires[0].id).toBe(wire.id);
  });
});

describe('Wire Persistence - undo/redo', () => {
  it('undoing component addition keeps wires intact', () => {
    const sw = createComponent('SWITCH', 0, 0);
    const led = createComponent('LED', 200, 0);
    const s = useAppStore.getState();
    s.addComponent(sw); s.addComponent(led);
    const c0 = getCircuit();
    const swO = c0.components.find(x => x.id === sw.id)!.pins.find(p => p.direction === 'output')!;
    const ledI = c0.components.find(x => x.id === led.id)!.pins.find(p => p.direction === 'input')!;
    const wire = makeWire(swO.id, ledI.id);
    s.addWire(wire);
    expect(getCircuit().wires).toHaveLength(1);
    s.addComponent(createComponent('AND', 400, 400));
    expect(getCircuit().wires).toHaveLength(1);
    s.undo();
    expect(getCircuit().wires).toHaveLength(1);
    expect(getCircuit().wires[0].id).toBe(wire.id);
  });
});
