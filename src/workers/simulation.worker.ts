/**
 * Simulation Web Worker
 * Runs the event-driven simulation engine off the main thread
 */

import { SimulationEngine, ComponentLogicRegistry, registerBuiltInLogics } from '@engine/simulation';
import type { CircuitComponent, Wire, SignalValue, SimulationMode, SimulationSpeed } from '@apptypes/core';
import * as Comlink from 'comlink';

const registry = new ComponentLogicRegistry();
registerBuiltInLogics(registry);
const engine = new SimulationEngine(registry);

const api = {
  loadCircuit: (components: CircuitComponent[], wires: Wire[]) => engine.loadCircuit(components, wires),
  start: (mode?: SimulationMode) => engine.start(mode),
  pause: () => engine.pause(),
  step: () => engine.step(),
  reset: () => engine.reset(),
  forcePinValue: (pinId: string, value: SignalValue) => engine.forcePinValue(pinId, value),
  getState: () => engine.getState(),
  getPinValue: (pinId: string) => engine.getPinValue(pinId),
  getWireValue: (wireId: string) => engine.getWireValue(wireId),
  getHazards: () => engine.getHazards(),
  getOscillations: () => engine.getOscillations(),
  setSpeed: (speed: SimulationSpeed) => engine.setSpeed(speed),
  setPropagationDelay: (delay: number) => engine.setPropagationDelay(delay),
  tick: () => {
    engine.processTick();
    return snapshot();
  },
  snapshot: () => snapshot(),
  onTick: (callback: (data: unknown) => void) => engine.on('tick', callback),
  onPinChanged: (callback: (data: unknown) => void) => engine.on('pinChanged', callback),
  onWireChanged: (callback: (data: unknown) => void) => engine.on('wireChanged', callback),
};

function snapshot() {
  return {
    state: engine.getState(),
    pinValues: [...engine.getAllPinValues().entries()],
    // The engine deliberately owns the circuit during simulation; only deltas
    // cross the worker boundary after load.
    wireValues: [...engine.getAllWireValues().entries()],
    hazards: engine.getHazards(),
    oscillations: engine.getOscillations(),
  };
}

Comlink.expose(api);
