import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/state/store';

describe('Architecture ↔ Simulator Integration', () => {
  beforeEach(() => {
    useAppStore.getState().newProject();
  });

  it('preserves existing components when sending bits from architecture lab', async () => {
    const store = useAppStore.getState();
    const curCircuitId = store.currentCircuitId!;

    // Initial state: empty or user circuit
    const circuitBefore = store.project?.circuits.find(c => c.id === curCircuitId);
    expect(circuitBefore).toBeDefined();
    const initialCompCount = circuitBefore!.components.length;

    // Send bits [1, 1, 0, 1] (13 in binary) to circuit
    store.sendBitsToCircuit([1, 1, 0, 1], 'TestVal');

    // Wait a tick for dynamic component creation
    await new Promise(r => setTimeout(r, 50));

    const stateAfter = useAppStore.getState();
    const circuitAfter = stateAfter.project?.circuits.find(c => c.id === curCircuitId);

    expect(circuitAfter?.components.length).toBe(initialCompCount + 4);
    // Verified mode switched to simulator
    expect(stateAfter.appMode).toBe('simulator');
    // Verified components are selected
    expect(stateAfter.selection.selectedEntityIds.size).toBe(4);
  });

  it('supports app mode switching without resetting circuit state', () => {
    const store = useAppStore.getState();
    store.setAppMode('architecture');
    store.setArchPage('number-systems');

    expect(useAppStore.getState().appMode).toBe('architecture');
    expect(useAppStore.getState().archPage).toBe('number-systems');

    store.setAppMode('welcome');
    expect(useAppStore.getState().appMode).toBe('welcome');

    store.setAppMode('simulator');
    expect(useAppStore.getState().appMode).toBe('simulator');
    expect(useAppStore.getState().project).not.toBeNull();
  });
});
