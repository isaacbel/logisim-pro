/**
 * Circuit Selectors — Narrow Zustand selectors for circuit data.
 * Import these instead of calling useAppStore() with no selector.
 */
import type { AppState } from '@state/store';
import type { Circuit, CircuitComponent, Wire } from '@apptypes/core';

export const selectProject = (s: AppState) => s.project;

export const selectCurrentCircuit = (s: AppState): Circuit | null =>
  s.project?.circuits.find(c => c.id === s.currentCircuitId) ?? null;

export const selectCurrentCircuitId = (s: AppState) => s.currentCircuitId;

export const selectCircuits = (s: AppState) => s.project?.circuits ?? [];

export const selectComponents = (s: AppState): CircuitComponent[] =>
  selectCurrentCircuit(s)?.components ?? [];

export const selectWires = (s: AppState): Wire[] =>
  selectCurrentCircuit(s)?.wires ?? [];

export const selectCircuitVersion = (s: AppState) => s.circuitVersion;

export const selectHistoryPast = (s: AppState) => s.historyPast;
export const selectHistoryFuture = (s: AppState) => s.historyFuture;
export const selectCanUndo = (s: AppState) => s.historyPast.length > 0;
export const selectCanRedo = (s: AppState) => s.historyFuture.length > 0;
