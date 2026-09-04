/**
 * Simulation Selectors — Narrow Zustand selectors for simulation state.
 */
import type { AppState } from '@state/store';

export const selectSimulation = (s: AppState) => s.simulation;
export const selectIsRunning = (s: AppState) => s.simulation.isRunning;
export const selectSimTick = (s: AppState) => s.simulation.tick;
export const selectSimMode = (s: AppState) => s.simulation.mode;
export const selectSimSpeed = (s: AppState) => s.simulation.speed;
export const selectDetectedHazards = (s: AppState) => s.simulation.detectedHazards;
export const selectDetectedOscillations = (s: AppState) => s.simulation.detectedOscillations;
export const selectProbes = (s: AppState) => s.probes;
export const selectRenderStats = (s: AppState) => s.renderStats;
