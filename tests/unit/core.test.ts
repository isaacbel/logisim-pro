import { describe, it, expect } from 'vitest';
import { World, System } from '@core/ecs/core';
import { SimulationEngine, ComponentLogicRegistry, registerBuiltInLogics, resolveSignal } from '@engine/simulation';
import { SignalValue } from '@apptypes/core';

describe('ECS Core', () => {
  it('should create entities', () => {
    const world = new World();
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    expect(e1).toBe('entity_1');
    expect(e2).toBe('entity_2');
  });

  it('should add and retrieve components', () => {
    const world = new World();
    const entity = world.createEntity();
    const component = { type: 'transform', entityId: entity, x: 10, y: 20 };
    world.addComponent(entity, component);
    const retrieved = world.getComponent(entity, 'transform');
    expect(retrieved).toEqual(component);
  });

  it('should query entities by components', () => {
    const world = new World();
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    world.addComponent(e1, { type: 'transform', entityId: e1, x: 0, y: 0 });
    world.addComponent(e1, { type: 'render', entityId: e1, color: 'red' });
    world.addComponent(e2, { type: 'transform', entityId: e2, x: 10, y: 10 });

    const results = world.getEntitiesWith('transform', 'render');
    expect(results).toContain(e1);
    expect(results).not.toContain(e2);
  });
});

describe('Signal Resolution', () => {
  it('should resolve single value', () => {
    expect(resolveSignal([SignalValue.HIGH])).toBe(SignalValue.HIGH);
    expect(resolveSignal([SignalValue.LOW])).toBe(SignalValue.LOW);
  });

  it('should detect conflicts', () => {
    expect(resolveSignal([SignalValue.HIGH, SignalValue.LOW])).toBe(SignalValue.ERROR);
  });

  it('should prioritize error over all', () => {
    expect(resolveSignal([SignalValue.HIGH, SignalValue.ERROR])).toBe(SignalValue.ERROR);
  });

  it('should return floating if only floating', () => {
    expect(resolveSignal([SignalValue.FLOATING, SignalValue.FLOATING])).toBe(SignalValue.FLOATING);
  });
});

describe('Simulation Engine', () => {
  it('should evaluate AND gate correctly', () => {
    const registry = new ComponentLogicRegistry();
    registerBuiltInLogics(registry);
    const engine = new SimulationEngine(registry);

    expect(registry.evaluate('AND', [SignalValue.HIGH, SignalValue.HIGH], {})).toEqual([SignalValue.HIGH]);
    expect(registry.evaluate('AND', [SignalValue.HIGH, SignalValue.LOW], {})).toEqual([SignalValue.LOW]);
    expect(registry.evaluate('AND', [SignalValue.LOW, SignalValue.LOW], {})).toEqual([SignalValue.LOW]);
  });

  it('should evaluate NOT gate correctly', () => {
    const registry = new ComponentLogicRegistry();
    registerBuiltInLogics(registry);

    expect(registry.evaluate('NOT', [SignalValue.HIGH], {})).toEqual([SignalValue.LOW]);
    expect(registry.evaluate('NOT', [SignalValue.LOW], {})).toEqual([SignalValue.HIGH]);
  });

  it('should detect oscillation', () => {
    const registry = new ComponentLogicRegistry();
    registerBuiltInLogics(registry);
    const engine = new SimulationEngine(registry, { oscillationThreshold: 10 });

    // Create a NOT gate with feedback (oscillator)
    const notGate = {
      id: 'not1',
      type: 'NOT',
      category: 'gates' as const,
      name: 'NOT',
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      pins: [
        { id: 'in1', name: 'in', direction: 'input' as const, bitWidth: 1, position: { x: -10, y: 25 }, shape: 'line' as const, currentValue: SignalValue.UNKNOWN, connectedWireIds: [] },
        { id: 'out1', name: 'out', direction: 'output' as const, bitWidth: 1, position: { x: 60, y: 25 }, shape: 'line' as const, currentValue: SignalValue.UNKNOWN, connectedWireIds: [] },
      ],
      properties: {},
      bounds: { x: 0, y: 0, width: 50, height: 50 },
    };

    const wire = {
      id: 'w1',
      segments: [{ from: { x: 60, y: 25 }, to: { x: -10, y: 25 } }],
      fromPinId: 'out1',
      toPinId: 'in1',
      bitWidth: 1,
      isBus: false,
      currentValue: SignalValue.UNKNOWN,
      junctions: [],
    };

    engine.loadCircuit([notGate], [wire]);
    engine.forcePinValue('in1', SignalValue.HIGH);

    // Run several ticks
    for (let i = 0; i < 20; i++) {
      engine.processTick();
    }

    const hazards = engine.getHazards();
    expect(hazards.length).toBeGreaterThan(0);
  });

  it('keeps D flip-flop state until the next rising clock edge', () => {
    const registry = new ComponentLogicRegistry();
    registerBuiltInLogics(registry);
    const engine = new SimulationEngine(registry);
    const pins = [
      ['d', 'D', 'input'], ['clk', 'CLK', 'input'], ['rst', 'RST', 'input'], ['pre', 'PRE', 'input'],
      ['q', 'Q', 'output'], ['qb', 'QB', 'output'],
    ].map(([id, name, direction], index) => ({ id, name, direction: direction as 'input' | 'output', bitWidth: 1, position: { x: index < 4 ? 0 : 50, y: index * 10 }, shape: 'line' as const, currentValue: SignalValue.UNKNOWN, connectedWireIds: [] }));
    engine.loadCircuit([{ id: 'ff', type: 'D_FLIPFLOP', category: 'memory', name: 'D FF', transform: { x: 0, y: 0, scale: 1, rotation: 0 }, pins, properties: {}, bounds: { x: 0, y: 0, width: 50, height: 60 } }], []);

    engine.forcePinValue('d', SignalValue.HIGH);
    engine.forcePinValue('clk', SignalValue.HIGH);
    engine.processTick();
    engine.processTick();
    expect(engine.getPinValue('q')).toBe(SignalValue.HIGH);

    engine.forcePinValue('d', SignalValue.LOW);
    engine.processTick();
    expect(engine.getPinValue('q')).toBe(SignalValue.HIGH);

    engine.forcePinValue('clk', SignalValue.LOW);
    engine.processTick();
    engine.forcePinValue('clk', SignalValue.HIGH);
    engine.processTick();
    engine.processTick();
    expect(engine.getPinValue('q')).toBe(SignalValue.LOW);
  });
});
