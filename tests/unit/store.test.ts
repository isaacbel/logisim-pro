import { beforeEach, describe, expect, it } from 'vitest';
import { createComponent } from '@core/components/factory';
import { SignalValue } from '@apptypes/core';
import { useAppStore } from '@state/store';

describe('circuit store', () => {
  beforeEach(() => useAppStore.getState().newProject());

  it('cleans connected wires when deleting a component', () => {
    const store = useAppStore.getState();
    const input = createComponent('SWITCH', 0, 0);
    const output = createComponent('LED', 100, 0);
    store.addComponent(input);
    store.addComponent(output);
    store.addWire({ id: 'wire', fromPinId: input.pins[0].id, toPinId: output.pins[0].id, segments: [], bitWidth: 1, isBus: false, currentValue: SignalValue.UNKNOWN, junctions: [] });
    store.removeComponent(input.id);
    const circuit = useAppStore.getState().project!.circuits[0];
    expect(circuit.components).toHaveLength(1);
    expect(circuit.wires).toHaveLength(0);
  });

  it('stores labels canonically and restores an edit through undo', () => {
    const store = useAppStore.getState();
    const component = createComponent('AND', 0, 0);
    store.addComponent(component);
    store.updateComponentLabel(component.id, 'combine');
    expect(useAppStore.getState().project!.circuits[0].components[0].label).toBe('combine');
    useAppStore.getState().undo();
    expect(useAppStore.getState().project!.circuits[0].components[0].label).toBe('AND');
  });
});
