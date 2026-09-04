import * as Comlink from 'comlink';
import { SignalValue } from '@apptypes/core';
import type { CircuitComponent, SimulationMode, SimulationSpeed, Wire } from '@apptypes/core';
import { useAppStore } from '@state/store';

type Snapshot = {
  state: ReturnType<typeof useAppStore.getState>['simulation'];
  pinValues: [string, SignalValue][];
  wireValues: [string, SignalValue][];
  hazards: ReturnType<typeof useAppStore.getState>['simulation']['detectedHazards'];
  oscillations: ReturnType<typeof useAppStore.getState>['simulation']['detectedOscillations'];
};

interface WorkerApi {
  loadCircuit(components: CircuitComponent[], wires: Wire[]): Promise<void>;
  start(mode?: SimulationMode): Promise<void>;
  pause(): Promise<void>;
  tick(): Promise<Snapshot>;
  reset(): Promise<void>;
  forcePinValue(pinId: string, value: SignalValue): Promise<void>;
  setSpeed(speed: SimulationSpeed): Promise<void>;
}

/** Owns exactly one worker and applies only results from the latest loaded circuit. */
export class SimulationService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<WorkerApi> | null = null;
  private timer: number | null = null;
  private revision = 0;
  private loadedCircuitId: string | null = null;
  /**
   * Track the circuitVersion from the store instead of JSON-serializing the circuit.
   * This is O(1) instead of O(n) where n = circuit size.
   */
  private loadedCircuitVersion = -1;
  private inFlight = false;

  private ensureWorker(): Comlink.Remote<WorkerApi> {
    if (!this.api) {
      this.worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' });
      this.worker.addEventListener('error', event => {
        useAppStore.getState().logMessage('error', `Simulation worker failed: ${event.message}`);
        this.disposeWorker();
      });
      this.api = Comlink.wrap<WorkerApi>(this.worker);
    }
    return this.api;
  }

  private getCircuit(): { id: string; version: number; components: CircuitComponent[]; wires: Wire[] } | null {
    const state = useAppStore.getState();
    const circuit = state.project?.circuits.find(item => item.id === state.currentCircuitId);
    if (!circuit) return null;
    return { id: circuit.id, version: state.circuitVersion, components: circuit.components, wires: circuit.wires };
  }

  async syncCircuit(): Promise<boolean> {
    const circuit = this.getCircuit();
    if (!circuit) return false;
    const revision = ++this.revision;
    // Use structuredClone only when we actually need to sync (not on every tick check)
    await this.ensureWorker().loadCircuit(structuredClone(circuit.components), structuredClone(circuit.wires));
    if (revision !== this.revision) return false;
    this.loadedCircuitId = circuit.id;
    this.loadedCircuitVersion = circuit.version;
    return true;
  }

  private async ensureCircuitSynced(): Promise<void> {
    const circuit = this.getCircuit();
    if (!circuit) return;
    // O(1) check: compare circuit version counter instead of JSON.stringify the whole circuit
    if (this.loadedCircuitId !== circuit.id || this.loadedCircuitVersion !== circuit.version) {
      await this.syncCircuit();
    }
  }

  async run(): Promise<void> {
    await this.ensureCircuitSynced();
    await this.ensureWorker().start('continuous');
    useAppStore.getState().setSimulationState({ isRunning: true, mode: 'continuous' });
    this.startLoop();
  }

  async start(): Promise<void> {
    await this.run();
  }

  async pause(): Promise<void> {
    if (this.api) await this.api.pause();
    this.stopLoop();
    useAppStore.getState().setSimulationState({ isRunning: false, mode: 'paused' });
  }

  async step(): Promise<void> {
    await this.ensureCircuitSynced();
    await this.tick(true);
  }

  async stepFast(ticks = 10): Promise<void> {
    await this.ensureCircuitSynced();
    for (let i = 0; i < ticks; i++) {
      await this.tick(true);
    }
  }

  async reset(): Promise<void> {
    await this.syncCircuit();
    await this.ensureWorker().reset();
    this.stopLoop();
    useAppStore.getState().setSimulationState({ isRunning: false, mode: 'paused', tick: 0, detectedHazards: [], detectedOscillations: [] });
  }

  async forcePinValue(pinId: string, value: SignalValue): Promise<void> {
    await this.ensureCircuitSynced();
    await this.ensureWorker().forcePinValue(pinId, value);
    await this.tick(false);
  }

  async setSpeed(speed: SimulationSpeed): Promise<void> {
    if (this.api) await this.api.setSpeed(speed);
  }

  private intervalMs(): number {
    const speed = useAppStore.getState().simulation.speed;
    return speed === 'slow' ? 300 : speed === 'fast' ? 30 : speed === 'unlimited' ? 0 : 100;
  }

  private startLoop(): void {
    this.stopLoop();
    const schedule = () => {
      const delay = this.intervalMs();
      this.timer = window.setTimeout(async () => {
        if (!useAppStore.getState().simulation.isRunning) return;
        await this.tick(false);
        schedule();
      }, delay);
    };
    schedule();
  }

  private stopLoop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async tick(forced: boolean): Promise<void> {
    if (this.inFlight && !forced) return;
    this.inFlight = true;
    try {
      const snapshot = await this.ensureWorker().tick();
      useAppStore.getState().applySimulationSnapshot(snapshot);
    } finally {
      this.inFlight = false;
    }
  }

  disposeWorker(): void {
    this.stopLoop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.api = null;
    this.loadedCircuitId = null;
    this.loadedCircuitVersion = -1;
    this.inFlight = false;
  }

  dispose(): void {
    this.disposeWorker();
  }
}

export const simulationService = new SimulationService();
