/**
 * Event-Driven Simulation Engine with Full Electrical Net Resolution
 */

import { SignalValue } from '@apptypes/core';
import type {
  SimulationEvent,
  SimulationState,
  SimulationMode,
  SimulationSpeed,
  HazardReport,
  OscillationReport,
  CircuitComponent,
  Pin,
  Wire,
} from '@apptypes/core';
import { EventEmitter } from 'eventemitter3';

interface QueueNode {
  tick: number;
  event: SimulationEvent;
}

class PriorityQueue {
  private heap: QueueNode[] = [];

  private leftChild(i: number): number { return 2 * i + 1; }
  private rightChild(i: number): number { return 2 * i + 2; }
  private parent(i: number): number { return Math.floor((i - 1) / 2); }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private heapifyDown(index: number): void {
    let current = index;
    const n = this.heap.length;
    while (current < n) {
      let smallest = current;
      const left = this.leftChild(current);
      const right = this.rightChild(current);
      if (left < n && this.heap[left].tick < this.heap[smallest].tick) smallest = left;
      if (right < n && this.heap[right].tick < this.heap[smallest].tick) smallest = right;
      if (smallest === current) break;
      this.swap(current, smallest);
      current = smallest;
    }
  }

  /** O(log n) bubble-up after push. */
  private heapifyUp(index: number): void {
    let current = index;
    while (current > 0) {
      const p = this.parent(current);
      if (this.heap[p].tick <= this.heap[current].tick) break;
      this.swap(p, current);
      current = p;
    }
  }

  /**
   * Maps targetPinId → the tick of the LATEST enqueued event for that pin.
   * Stale entries (older tick) are skipped at dequeue time (lazy deletion),
   * avoiding the previous O(n) filter() + full heap rebuild on every enqueue.
   */
  private latestTickByPin = new Map<string, number>();

  /** O(log n) enqueue. */
  enqueue(tick: number, event: SimulationEvent): void {
    this.latestTickByPin.set(event.targetPinId, tick);
    this.heap.push({ tick, event });
    this.heapifyUp(this.heap.length - 1);
  }

  /** O(log n) dequeue with lazy stale-event skipping. */
  dequeue(): QueueNode | undefined {
    while (this.heap.length > 0) {
      let root: QueueNode;
      if (this.heap.length === 1) {
        root = this.heap.pop()!;
      } else {
        root = this.heap[0];
        this.heap[0] = this.heap.pop()!;
        this.heapifyDown(0);
      }
      // Lazy dedup: skip this node if a newer event was enqueued for the same pin
      const latest = this.latestTickByPin.get(root.event.targetPinId);
      if (latest === root.tick) {
        this.latestTickByPin.delete(root.event.targetPinId);
        return root;
      }
      // Stale node — discard and try the next one
    }
    return undefined;
  }

  peek(): QueueNode | undefined {
    return this.heap[0];
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  size(): number {
    return this.heap.length;
  }

  clear(): void {
    this.heap = [];
    this.latestTickByPin.clear();
  }
}


export function resolveSignal(values: SignalValue[]): SignalValue {
  if (values.length === 0) return SignalValue.UNKNOWN;
  if (values.length === 1) return values[0];
  const hasError = values.includes(SignalValue.ERROR);
  const hasHigh = values.includes(SignalValue.HIGH);
  const hasLow = values.includes(SignalValue.LOW);
  if (hasError) return SignalValue.ERROR;
  if (hasHigh && hasLow) return SignalValue.ERROR;
  if (hasHigh) return SignalValue.HIGH;
  if (hasLow) return SignalValue.LOW;
  if (values.includes(SignalValue.FLOATING)) return SignalValue.FLOATING;
  return SignalValue.UNKNOWN;
}

export type LogicFunction = (inputs: SignalValue[], props: Record<string, unknown>) => SignalValue[];

export class ComponentLogicRegistry {
  private logics: Map<string, LogicFunction> = new Map();

  register(type: string, logic: LogicFunction): void {
    this.logics.set(type, logic);
  }

  evaluate(type: string, inputs: SignalValue[], props: Record<string, unknown>): SignalValue[] {
    const logic = this.logics.get(type);
    if (!logic) throw new Error(`No logic registered for: ${type}`);
    return logic(inputs, props);
  }

  has(type: string): boolean {
    return this.logics.has(type);
  }
}

interface SimulationConfig {
  maxTicks: number;
  oscillationThreshold: number;
  maxEventsPerTick: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  maxTicks: 1_000_000,
  oscillationThreshold: 100,
  maxEventsPerTick: 10_000,
};

interface ElectricalNet {
  id: string;
  wireIds: Set<string>;
  pinIds: Set<string>;
}

export class SimulationEngine extends EventEmitter {
  private state: SimulationState;
  private eventQueue: PriorityQueue = new PriorityQueue();
  private registry: ComponentLogicRegistry;
  private config: SimulationConfig;
  private pinValues: Map<string, SignalValue> = new Map();
  private wireValues: Map<string, SignalValue> = new Map();
  private componentInputs: Map<string, SignalValue[]> = new Map();
  private componentOutputs: Map<string, SignalValue[]> = new Map();
  private pinHistory: Map<string, SignalValue[]> = new Map();
  private oscillationReports: OscillationReport[] = [];
  private hazardReports: HazardReport[] = [];
  private components: Map<string, CircuitComponent> = new Map();
  private wires: Map<string, Wire> = new Map();
  private nets: ElectricalNet[] = [];
  private pinToNet: Map<string, ElectricalNet> = new Map();
  private wireToNet: Map<string, ElectricalNet> = new Map();
  private componentRuntime: Map<string, Record<string, unknown>> = new Map();

  constructor(registry: ComponentLogicRegistry, config: Partial<SimulationConfig> = {}) {
    super();
    this.registry = registry;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      mode: 'paused',
      speed: 'normal',
      tick: 0,
      isRunning: false,
      propagationDelay: 1,
      detectedHazards: [],
      detectedOscillations: [],
    };
  }

  loadCircuit(components: CircuitComponent[], wires: Wire[]): void {
    this.components.clear();
    this.wires.clear();
    this.pinValues.clear();
    this.wireValues.clear();
    this.componentInputs.clear();
    this.componentOutputs.clear();
    this.pinHistory.clear();
    this.componentRuntime.clear();
    this.eventQueue.clear();
    this.oscillationReports = [];
    this.hazardReports = [];

    for (const comp of components) {
      this.components.set(comp.id, comp);
      this.componentInputs.set(comp.id, comp.pins.map(() => SignalValue.UNKNOWN));
      this.componentOutputs.set(comp.id, comp.pins.map(() => SignalValue.UNKNOWN));
      for (const pin of comp.pins) {
        this.pinValues.set(pin.id, SignalValue.UNKNOWN);
        this.pinHistory.set(pin.id, []);
      }
    }

    for (const wire of wires) {
      this.wires.set(wire.id, wire);
      this.wireValues.set(wire.id, SignalValue.UNKNOWN);
    }

    this.rebuildNets();
    this.state.tick = 0;

    // Initialize all source components (constants, switches, clocks, push-buttons, input pins)
    for (const comp of components) {
      if (['CONSTANT', 'CONSTANT_0', 'CONSTANT_1', 'RESULT_CONSTANT', 'SWITCH', 'PUSH_BUTTON', 'CLOCK', 'INPUT_PIN'].includes(comp.type)) {
        const runtime = this.componentRuntime.get(comp.id) ?? {};
        const outputs = this.evaluateComponent(comp, [], { ...comp.properties, ...runtime }, runtime);
        const outputPins = comp.pins.filter(p => p.direction === 'output' || p.direction === 'bidirectional');
        for (let i = 0; i < outputs.length && i < outputPins.length; i++) {
          this.pinValues.set(outputPins[i].id, outputs[i]);
          this.recordPinHistory(outputPins[i].id, outputs[i]);
        }
      }
    }

    // Run convergence settle so all combinational logic resolves before first tick
    const MAX_SETTLE = 30;
    for (let iteration = 0; iteration < MAX_SETTLE; iteration++) {
      this.resolveAllNets();
      this.updateComponentInputs();
      const changed = this.evaluateComponentsImmediate();
      if (!changed) break;
    }
    this.resolveAllNets(); // Final net resolution to update wire values

    this.emit('circuitLoaded', { componentCount: components.length, wireCount: wires.length, netCount: this.nets.length });
  }


  /**
   * Rebuilds electrical nets by grouping connected wires and pins into disjoint electrical nodes.
   */
  private rebuildNets(): void {
    this.nets = [];
    this.pinToNet.clear();
    this.wireToNet.clear();

    const parent = new Map<string, string>();
    const find = (id: string): string => {
      if (!parent.has(id)) parent.set(id, id);
      if (parent.get(id) !== id) {
        parent.set(id, find(parent.get(id)!));
      }
      return parent.get(id)!;
    };
    const union = (id1: string, id2: string) => {
      const root1 = find(id1);
      const root2 = find(id2);
      if (root1 !== root2) parent.set(root1, root2);
    };

    // 1. Union pins connected by wires
    for (const wire of this.wires.values()) {
      union(`pin:${wire.fromPinId}`, `pin:${wire.toPinId}`);
      union(`wire:${wire.id}`, `pin:${wire.fromPinId}`);
    }

    // 2. Union wires that share a junction coordinate
    const junctionGroups = new Map<string, string[]>();
    for (const wire of this.wires.values()) {
      if (wire.junctions) {
        for (const j of wire.junctions) {
          const key = `${Math.round(j.x)},${Math.round(j.y)}`;
          if (!junctionGroups.has(key)) junctionGroups.set(key, []);
          junctionGroups.get(key)!.push(wire.id);
        }
      }
    }
    for (const wireIds of junctionGroups.values()) {
      for (let i = 0; i < wireIds.length - 1; i++) {
        union(`wire:${wireIds[i]}`, `wire:${wireIds[i + 1]}`);
      }
    }

    // 3. Build net objects
    const netGroups = new Map<string, { pinIds: Set<string>; wireIds: Set<string> }>();
    for (const [key] of parent) {
      const root = find(key);
      if (!netGroups.has(root)) netGroups.set(root, { pinIds: new Set(), wireIds: new Set() });
      const group = netGroups.get(root)!;
      if (key.startsWith('pin:')) group.pinIds.add(key.slice(4));
      if (key.startsWith('wire:')) group.wireIds.add(key.slice(5));
    }

    let netIdx = 0;
    for (const group of netGroups.values()) {
      const net: ElectricalNet = {
        id: `net_${netIdx++}`,
        pinIds: group.pinIds,
        wireIds: group.wireIds,
      };
      this.nets.push(net);
      for (const pId of net.pinIds) this.pinToNet.set(pId, net);
      for (const wId of net.wireIds) this.wireToNet.set(wId, net);
    }
  }

  start(mode: SimulationMode = 'continuous'): void {
    this.state.mode = mode;
    this.state.isRunning = true;
    this.emit('started', this.state);
  }

  pause(): void {
    this.state.mode = 'paused';
    this.state.isRunning = false;
    this.emit('paused', this.state);
  }

  step(): void {
    if (this.state.mode !== 'stepped') this.state.mode = 'stepped';
    this.state.isRunning = true;
    this.processTick();
    this.state.isRunning = false;
    this.emit('stepped', this.state);
  }

  reset(): void {
    this.state.tick = 0;
    this.state.isRunning = false;
    this.state.mode = 'paused';
    this.eventQueue.clear();
    for (const [pinId] of this.pinValues) this.pinValues.set(pinId, SignalValue.UNKNOWN);
    for (const [wireId] of this.wireValues) this.wireValues.set(wireId, SignalValue.UNKNOWN);
    for (const [compId, inputs] of this.componentInputs) this.componentInputs.set(compId, inputs.map(() => SignalValue.UNKNOWN));
    for (const [compId, outputs] of this.componentOutputs) this.componentOutputs.set(compId, outputs.map(() => SignalValue.UNKNOWN));
    this.componentRuntime.clear();
    this.emit('reset', this.state);
  }

  setSpeed(speed: SimulationSpeed): void { this.state.speed = speed; }
  setPropagationDelay(delay: number): void { this.state.propagationDelay = Math.max(0, delay); }

  scheduleEvent(targetPinId: string, newValue: SignalValue, sourceComponentId: string): void {
    const event: SimulationEvent = {
      tick: this.state.tick + this.state.propagationDelay,
      targetPinId,
      newValue,
      sourceComponentId,
    };
    this.eventQueue.enqueue(event.tick, event);
  }

  forcePinValue(pinId: string, value: SignalValue): void {
    const compId = this.findComponentIdForPin(pinId);
    if (compId !== 'unknown') {
      const comp = this.components.get(compId);
      if (comp) {
        let runtime = this.componentRuntime.get(compId);
        if (!runtime) {
          runtime = {};
          this.componentRuntime.set(compId, runtime);
        }
        if (comp.type === 'SWITCH') {
          runtime.isOn = value === SignalValue.HIGH;
          comp.properties['isOn'] = value === SignalValue.HIGH;
        } else if (comp.type === 'PUSH_BUTTON') {
          runtime.isPressed = value === SignalValue.HIGH;
          comp.properties['isPressed'] = value === SignalValue.HIGH;
        } else if (comp.type === 'CLOCK') {
          runtime.state = value === SignalValue.HIGH;
          comp.properties['state'] = value === SignalValue.HIGH;
        } else if (comp.type === 'CONSTANT' || comp.type === 'CONSTANT_0' || comp.type === 'CONSTANT_1') {
          runtime.value = value === SignalValue.HIGH ? 1 : 0;
          comp.properties['value'] = value === SignalValue.HIGH ? 1 : 0;
        } else if (comp.type === 'INPUT_PIN') {
          const numVal = value === SignalValue.HIGH ? 1 : (value === SignalValue.LOW ? 0 : Number(value));
          runtime.value = numVal;
          comp.properties['value'] = numVal;
        }
      }
    }

    this.pinValues.set(pinId, value);
    this.recordPinHistory(pinId, value);
    this.propagateNetForPin(pinId);
    this.detectHazard(pinId, value);
    // Run full convergence settle so the forced value propagates immediately
    const MAX_SETTLE = 20;
    let settled = false;
    for (let iteration = 0; iteration < MAX_SETTLE; iteration++) {
      this.updateComponentInputs();
      const changed = this.evaluateComponentsImmediate();
      this.resolveAllNets();
      if (!changed) {
        settled = true;
        break;
      }
    }
    if (!settled) {
      const compIds = Array.from(this.components.keys());
      this.hazardReports.push({
        tick: this.state.tick,
        componentId: compIds[0] ?? 'system',
        description: 'Oscillation / combinational feedback loop detected',
        severity: 'warning',
      });
      this.oscillationReports.push({
        tick: this.state.tick,
        componentIds: compIds,
        period: 1,
      });
    }
    this.emit('pinChanged', { pinId, value, tick: this.state.tick });
  }

  processTick(): void {
    if (this.state.tick >= this.config.maxTicks) {
      this.pause();
      this.emit('error', { message: 'Maximum tick count reached', type: 'limit' });
      return;
    }
    this.state.tick++;

    // Advance clock sources if simulation is running
    for (const [compId, comp] of this.components) {
      if (comp.type === 'CLOCK' && this.state.isRunning) {
        const freq = (comp.properties['frequency'] as number) || 1;
        const tickInterval = Math.max(1, Math.round(10 / freq));
        if (this.state.tick % tickInterval === 0) {
          const runtime = this.componentRuntime.get(compId) ?? {};
          const currentState = (runtime.state as boolean | undefined) ?? (comp.properties['state'] as boolean | undefined) ?? false;
          const nextState = !currentState;
          runtime.state = nextState;
          comp.properties['state'] = nextState;
          this.componentRuntime.set(compId, runtime);
        }
      }
    }

    let eventCount = 0;
    while (!this.eventQueue.isEmpty()) {
      const node = this.eventQueue.peek();
      if (!node || node.tick > this.state.tick) break;
      if (eventCount >= this.config.maxEventsPerTick) {
        this.hazardReports.push({
          tick: this.state.tick,
          componentId: 'system',
          description: 'Too many events in single tick - possible oscillation',
          severity: 'error',
        });
        break;
      }
      this.eventQueue.dequeue();
      this.processEvent(node.event);
      eventCount++;
    }

    // Run a convergence loop for combinational logic.
    // Iterate until pin values stop changing (or hit a safety cap).
    const MAX_SETTLE = 20;
    let settled = false;
    for (let iteration = 0; iteration < MAX_SETTLE; iteration++) {
      this.updateComponentInputs();
      const changed = this.evaluateComponentsImmediate();
      this.resolveAllNets();
      if (!changed) {
        settled = true;
        break;
      }
    }

    if (!settled) {
      const compIds = Array.from(this.components.keys());
      this.hazardReports.push({
        tick: this.state.tick,
        componentId: compIds[0] ?? 'system',
        description: 'Oscillation / combinational feedback loop detected',
        severity: 'warning',
      });
      this.oscillationReports.push({
        tick: this.state.tick,
        componentIds: compIds,
        period: 1,
      });
    }

    this.emit('tick', { tick: this.state.tick, eventsProcessed: eventCount });
  }

  private processEvent(event: SimulationEvent): void {
    const oldValue = this.pinValues.get(event.targetPinId);
    if (oldValue === event.newValue) return;
    this.pinValues.set(event.targetPinId, event.newValue);
    this.recordPinHistory(event.targetPinId, event.newValue);
    this.propagateNetForPin(event.targetPinId);
    this.detectHazard(event.targetPinId, event.newValue);
  }

  private recordPinHistory(pinId: string, value: SignalValue): void {
    const history = this.pinHistory.get(pinId);
    if (history) {
      history.push(value);
      if (history.length > this.config.oscillationThreshold) history.shift();
    }
  }

  private propagateNetForPin(pinId: string): void {
    const net = this.pinToNet.get(pinId);
    if (!net) return;
    this.resolveNet(net);
  }

  private resolveNet(net: ElectricalNet): void {
    const drivingValues: SignalValue[] = [];
    for (const pId of net.pinIds) {
      const pin = this.findPin(pId);
      if (pin && (pin.direction === 'output' || pin.direction === 'bidirectional')) {
        const val = this.pinValues.get(pId);
        if (val !== undefined && val !== SignalValue.UNKNOWN) {
          drivingValues.push(val);
        }
      }
    }
    const resolved = drivingValues.length > 0 ? resolveSignal(drivingValues) : SignalValue.UNKNOWN;
    for (const wireId of net.wireIds) {
      if (this.wireValues.get(wireId) !== resolved) {
        this.wireValues.set(wireId, resolved);
        this.emit('wireChanged', { wireId, value: resolved });
      }
    }
  }

  private resolveAllNets(): void {
    for (const net of this.nets) {
      this.resolveNet(net);
    }
    // After resolving nets, write the resolved value back to every input pin
    // so that pinValues is the complete, authoritative signal state for the renderer.
    for (const net of this.nets) {
      const drivingValues: SignalValue[] = [];
      for (const pId of net.pinIds) {
        const p = this.findPin(pId);
        if (p && (p.direction === 'output' || p.direction === 'bidirectional')) {
          const val = this.pinValues.get(pId);
          if (val !== undefined && val !== SignalValue.UNKNOWN) drivingValues.push(val);
        }
      }
      if (drivingValues.length > 0) {
        const resolved = resolveSignal(drivingValues);
        for (const pId of net.pinIds) {
          const p = this.findPin(pId);
          if (p && p.direction === 'input') {
            this.pinValues.set(pId, resolved);
          }
        }
      }
    }
  }

  private updateComponentInputs(): void {
    for (const [compId, comp] of this.components) {
      const inputs = comp.pins.map(pin => {
        if (pin.direction === 'input' || pin.direction === 'bidirectional') {
          // Read the value directly from pinValues (kept up-to-date by resolveAllNets)
          return this.pinValues.get(pin.id) ?? SignalValue.UNKNOWN;
        }
        return SignalValue.UNKNOWN;
      });
      this.componentInputs.set(compId, inputs);
    }
  }

  /**
   * Evaluate all components and IMMEDIATELY commit output values to pinValues.
   * Returns true if any pin value changed (used for convergence loop).
   */
  private evaluateComponentsImmediate(): boolean {
    let anyChanged = false;
    for (const [compId, comp] of this.components) {
      if (!this.registry.has(comp.type)) continue;
      const inputs = this.componentInputs.get(compId) ?? [];
      const inputIndices = comp.pins
        .map((p, idx) => ({ p, idx }))
        .filter(({ p }) => p.direction === 'input' || p.direction === 'bidirectional');
      const inputValues = inputIndices.map(({ idx }) => inputs[idx] ?? SignalValue.UNKNOWN);

      const runtime = this.componentRuntime.get(compId) ?? {};
      const props = { ...comp.properties, ...runtime };
      const outputs = this.evaluateComponent(comp, inputValues, props, runtime);
      if (Object.keys(runtime).length > 0) this.componentRuntime.set(compId, runtime);

      const outputPins = comp.pins.filter(p => p.direction === 'output' || p.direction === 'bidirectional');
      for (let i = 0; i < outputs.length && i < outputPins.length; i++) {
        const pinId = outputPins[i].id;
        const currentValue = this.pinValues.get(pinId);
        if (currentValue !== outputs[i]) {
          // Commit immediately so downstream components see the new value this tick
          this.pinValues.set(pinId, outputs[i]);
          this.recordPinHistory(pinId, outputs[i]);
          this.propagateNetForPin(pinId);
          this.detectHazard(pinId, outputs[i]);
          anyChanged = true;
        }
      }
    }
    return anyChanged;
  }



  private evaluateComponent(
    component: CircuitComponent,
    inputs: SignalValue[],
    props: Record<string, unknown>,
    runtime: Record<string, unknown>,
  ): SignalValue[] {
    if (component.type === 'SR_LATCH') {
      const s = inputs[0] ?? SignalValue.LOW;
      const r = inputs[1] ?? SignalValue.LOW;
      let q = (runtime.q as SignalValue | undefined) ?? SignalValue.LOW;
      if (s === SignalValue.HIGH && r === SignalValue.HIGH) {
        return [SignalValue.ERROR, SignalValue.ERROR];
      } else if (s === SignalValue.HIGH) {
        q = SignalValue.HIGH;
      } else if (r === SignalValue.HIGH) {
        q = SignalValue.LOW;
      }
      runtime.q = q;
      return [q, q === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
    }

    if (component.type === 'D_LATCH') {
      const d = inputs[0] ?? SignalValue.LOW;
      const en = inputs[1] ?? SignalValue.LOW;
      let q = (runtime.q as SignalValue | undefined) ?? SignalValue.LOW;
      if (en === SignalValue.HIGH) {
        q = d;
      }
      runtime.q = q;
      return [q, q === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
    }

    if (component.type === 'D_FLIPFLOP') {
      const d = inputs[0] ?? SignalValue.LOW;
      const clock = inputs[1] ?? SignalValue.LOW;
      const rst = inputs[2] ?? SignalValue.LOW;
      const pre = inputs[3] ?? SignalValue.LOW;
      let stored = (runtime.stored as SignalValue | undefined) ?? SignalValue.LOW;

      if (rst === SignalValue.HIGH) stored = SignalValue.LOW;
      else if (pre === SignalValue.HIGH) stored = SignalValue.HIGH;
      else if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        stored = d;
      }

      runtime.stored = stored;
      runtime.previousClock = clock;
      return [stored, stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
    }

    if (component.type === 'JK_FLIPFLOP') {
      const j = inputs[0] ?? SignalValue.LOW;
      const clock = inputs[1] ?? SignalValue.LOW;
      const k = inputs[2] ?? SignalValue.LOW;
      let stored = (runtime.stored as SignalValue | undefined) ?? SignalValue.LOW;

      if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (j === SignalValue.HIGH && k === SignalValue.HIGH) stored = stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH;
        else if (j === SignalValue.HIGH) stored = SignalValue.HIGH;
        else if (k === SignalValue.HIGH) stored = SignalValue.LOW;
      }

      runtime.stored = stored;
      runtime.previousClock = clock;
      return [stored, stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
    }

    if (component.type === 'T_FLIPFLOP') {
      const t = inputs[0] ?? SignalValue.LOW;
      const clock = inputs[1] ?? SignalValue.LOW;
      let stored = (runtime.stored as SignalValue | undefined) ?? SignalValue.LOW;

      if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (t === SignalValue.HIGH) {
          stored = stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH;
        }
      }

      runtime.stored = stored;
      runtime.previousClock = clock;
      return [stored, stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
    }

    if (component.type === 'SR_FLIPFLOP') {
      const s = inputs[0] ?? SignalValue.LOW;
      const clock = inputs[1] ?? SignalValue.LOW;
      const r = inputs[2] ?? SignalValue.LOW;
      const rst = inputs[3] ?? SignalValue.LOW;
      const pre = inputs[4] ?? SignalValue.LOW;
      let stored = (runtime.stored as SignalValue | undefined) ?? SignalValue.LOW;

      if (rst === SignalValue.HIGH) stored = SignalValue.LOW;
      else if (pre === SignalValue.HIGH) stored = SignalValue.HIGH;
      else if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (s === SignalValue.HIGH && r === SignalValue.HIGH) {
          return [SignalValue.ERROR, SignalValue.ERROR];
        } else if (s === SignalValue.HIGH) {
          stored = SignalValue.HIGH;
        } else if (r === SignalValue.HIGH) {
          stored = SignalValue.LOW;
        }
      }

      runtime.stored = stored;
      runtime.previousClock = clock;
      return [stored, stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
    }

    if (component.type === 'REGISTER') {
      const bitWidth = (props['bitWidth'] as number) ?? 4;
      const dataInputs = inputs.slice(0, bitWidth);
      const clock = inputs[bitWidth] ?? SignalValue.LOW;
      const en = inputs[bitWidth + 1];
      let storedValues = (runtime.storedValues as SignalValue[] | undefined) ?? Array(bitWidth).fill(SignalValue.LOW);

      const isEnabled = en === SignalValue.HIGH || en === SignalValue.UNKNOWN || en === undefined;

      if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (isEnabled) {
          storedValues = dataInputs.map(v => (v === SignalValue.HIGH ? SignalValue.HIGH : SignalValue.LOW));
        }
      }

      runtime.storedValues = storedValues;
      runtime.previousClock = clock;
      return storedValues;
    }

    if (component.type === 'COUNTER') {
      const bitWidth = (props['bitWidth'] as number) ?? 4;
      const maxVal = 1 << bitWidth;
      const clock = inputs[0] ?? SignalValue.LOW;
      const en = inputs[1];
      const rst = inputs[2];
      const up = inputs[3];
      let count = (runtime.count as number | undefined) ?? 0;

      const isEnabled = en === SignalValue.HIGH || en === SignalValue.UNKNOWN || en === undefined;
      const isReset = rst === SignalValue.HIGH;
      const isUp = up !== SignalValue.LOW;

      if (isReset) {
        count = 0;
      } else if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (isEnabled) {
          count = isUp ? (count + 1) % maxVal : (count - 1 + maxVal) % maxVal;
        }
      }

      runtime.count = count;
      runtime.previousClock = clock;

      const outputs: SignalValue[] = [];
      for (let i = 0; i < bitWidth; i++) {
        outputs.push(((count >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
      return outputs;
    }

    if (component.type === 'SHIFT_REGISTER') {
      const bitWidth = (props['bitWidth'] as number) ?? 4;
      const sin = inputs[0] ?? SignalValue.LOW;
      const load = inputs[1] ?? SignalValue.LOW;
      const dir = inputs[2] ?? SignalValue.LOW; // LOW = left (towards MSB), HIGH = right (towards LSB)
      const clock = inputs[3] ?? SignalValue.LOW;
      const parallelData = inputs.slice(4, 4 + bitWidth);
      let stored = (runtime.stored as SignalValue[] | undefined) ?? Array(bitWidth).fill(SignalValue.LOW);
      let sout = (runtime.sout as SignalValue | undefined) ?? SignalValue.LOW;

      if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (load === SignalValue.HIGH) {
          stored = parallelData.map(v => (v === SignalValue.HIGH ? SignalValue.HIGH : SignalValue.LOW));
          sout = dir === SignalValue.HIGH ? stored[0] : stored[bitWidth - 1];
        } else {
          if (dir === SignalValue.HIGH) {
            // Shift right (towards LSB)
            sout = stored[0];
            stored = [...stored.slice(1), sin === SignalValue.HIGH ? SignalValue.HIGH : SignalValue.LOW];
          } else {
            // Shift left (towards MSB)
            sout = stored[bitWidth - 1];
            stored = [sin === SignalValue.HIGH ? SignalValue.HIGH : SignalValue.LOW, ...stored.slice(0, bitWidth - 1)];
          }
        }
      }

      runtime.stored = stored;
      runtime.sout = sout;
      runtime.previousClock = clock;
      return [...stored, sout];
    }

    if (component.type === 'REGISTER_FILE') {
      const bitWidth = (props['bitWidth'] as number) ?? 4;
      const regCount = (props['regCount'] as number) ?? 4;
      const registers = (runtime.registers as number[] | undefined) ?? Array(regCount).fill(0);

      const ra0 = inputs[0] === SignalValue.HIGH ? 1 : 0;
      const ra1 = inputs[1] === SignalValue.HIGH ? 1 : 0;
      const readAddrA = (ra0 | (ra1 << 1)) % regCount;

      const rb0 = inputs[2] === SignalValue.HIGH ? 1 : 0;
      const rb1 = inputs[3] === SignalValue.HIGH ? 1 : 0;
      const readAddrB = (rb0 | (rb1 << 1)) % regCount;

      const wa0 = inputs[4] === SignalValue.HIGH ? 1 : 0;
      const wa1 = inputs[5] === SignalValue.HIGH ? 1 : 0;
      const writeAddr = (wa0 | (wa1 << 1)) % regCount;

      const we = inputs[6] ?? SignalValue.LOW;
      const clock = inputs[7] ?? SignalValue.LOW;
      const writeDataBits = inputs.slice(8, 8 + bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));

      if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (we === SignalValue.HIGH) {
          const val = writeDataBits.reduce<number>((acc, bit, idx) => acc + (bit << idx), 0);
          registers[writeAddr] = val;
        }
      }

      runtime.registers = registers;
      runtime.previousClock = clock;

      const valA = registers[readAddrA] ?? 0;
      const valB = registers[readAddrB] ?? 0;
      const outA: SignalValue[] = [];
      const outB: SignalValue[] = [];
      for (let i = 0; i < bitWidth; i++) {
        outA.push(((valA >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
        outB.push(((valB >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
      return [...outA, ...outB];
    }

    if (component.type === 'RAM') {
      const addrWidth = (props['addrWidth'] as number) ?? 4;
      const dataWidth = (props['dataWidth'] as number) ?? 8;
      const ramData = (runtime.ramData as number[] | undefined) ?? Array(1 << addrWidth).fill(0);

      const addrBits: number[] = inputs.slice(0, addrWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
      const addr = addrBits.reduce((acc, bit, idx) => acc + (bit << idx), 0);

      const we = inputs[addrWidth] ?? SignalValue.LOW;
      const oe = inputs[addrWidth + 1] ?? SignalValue.HIGH;
      const dataInBits: number[] = inputs.slice(addrWidth + 2, addrWidth + 2 + dataWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
      const clock = inputs[addrWidth + 2 + dataWidth] ?? SignalValue.LOW;

      if (we === SignalValue.HIGH) {
        const val = dataInBits.reduce((acc, bit, idx) => acc + (bit << idx), 0);
        ramData[addr] = val;
      }

      runtime.ramData = ramData;
      runtime.previousClock = clock;

      if (oe === SignalValue.HIGH) {
        const val = ramData[addr] ?? 0;
        const outputs: SignalValue[] = [];
        for (let i = 0; i < dataWidth; i++) {
          outputs.push(((val >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
        }
        return outputs;
      }
      return Array(dataWidth).fill(SignalValue.FLOATING);
    }

    if (component.type === 'ROM') {
      const addrWidth = (props['addrWidth'] as number) ?? 4;
      const dataWidth = (props['dataWidth'] as number) ?? 8;
      const romData = (props['romData'] as number[]) ?? Array(1 << addrWidth).fill(0);

      const addrBits: number[] = inputs.slice(0, addrWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
      const addr = addrBits.reduce((acc, bit, idx) => acc + (bit << idx), 0);

      const val = romData[addr] ?? 0;
      const outputs: SignalValue[] = [];
      for (let i = 0; i < dataWidth; i++) {
        outputs.push(((val >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
      return outputs;
    }

    if (component.type === 'DECADE_COUNTER') {
      const clock = inputs[0] ?? SignalValue.LOW;
      const en = inputs[1];
      const rst = inputs[2];
      let count = (runtime.count as number | undefined) ?? 0;

      const isEnabled = en === SignalValue.HIGH || en === SignalValue.UNKNOWN || en === undefined;
      const isReset = rst === SignalValue.HIGH;

      if (isReset) {
        count = 0;
      } else if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (isEnabled) {
          count = (count + 1) % 10;
        }
      }

      runtime.count = count;
      runtime.previousClock = clock;

      const outputs: SignalValue[] = [
        ((count >> 0) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW,
        ((count >> 1) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW,
        ((count >> 2) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW,
        ((count >> 3) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW,
        count === 9 ? SignalValue.HIGH : SignalValue.LOW, // TC
      ];
      return outputs;
    }

    if (component.type === 'RING_COUNTER') {
      const bitWidth = (props['bitWidth'] as number) ?? 4;
      const clock = inputs[0] ?? SignalValue.LOW;
      const rst = inputs[1] ?? SignalValue.LOW;
      let pattern = (runtime.pattern as number | undefined) ?? 1;

      if (rst === SignalValue.HIGH) {
        pattern = 1;
      } else if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        const msb = (pattern >> (bitWidth - 1)) & 1;
        pattern = ((pattern << 1) & ((1 << bitWidth) - 1)) | msb;
        if (pattern === 0) pattern = 1;
      }

      runtime.pattern = pattern;
      runtime.previousClock = clock;

      const outputs: SignalValue[] = [];
      for (let i = 0; i < bitWidth; i++) {
        outputs.push(((pattern >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
      return outputs;
    }

    if (component.type === 'JOHNSON_COUNTER') {
      const bitWidth = (props['bitWidth'] as number) ?? 4;
      const clock = inputs[0] ?? SignalValue.LOW;
      const rst = inputs[1] ?? SignalValue.LOW;
      let pattern = (runtime.pattern as number | undefined) ?? 0;

      if (rst === SignalValue.HIGH) {
        pattern = 0;
      } else if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        const msb = (pattern >> (bitWidth - 1)) & 1;
        const nextLsb = msb === 0 ? 1 : 0;
        pattern = ((pattern << 1) & ((1 << bitWidth) - 1)) | nextLsb;
      }

      runtime.pattern = pattern;
      runtime.previousClock = clock;

      const outputs: SignalValue[] = [];
      for (let i = 0; i < bitWidth; i++) {
        outputs.push(((pattern >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
      return outputs;
    }

    if (component.type === 'FIFO') {
      const dataWidth = (props['dataWidth'] as number) ?? 8;
      const depth = (props['depth'] as number) ?? 16;
      const clock = inputs[0] ?? SignalValue.LOW;
      const we = inputs[1] === SignalValue.HIGH;
      const re = inputs[2] === SignalValue.HIGH;
      const rst = inputs[3] === SignalValue.HIGH;
      const dinBits = inputs.slice(4, 4 + dataWidth).map(v => (v === SignalValue.HIGH ? 1 : 0) as number);
      const dinVal = dinBits.reduce((acc: number, bit: number, idx: number) => acc + (bit << idx), 0 as number);

      let queue = (runtime.queue as number[] | undefined) ?? [];
      let lastDout = (runtime.lastDout as number | undefined) ?? 0;

      if (rst) {
        queue = [];
        lastDout = 0;
      } else if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (re && queue.length > 0) {
          lastDout = queue.shift()!;
        }
        if (we && queue.length < depth) {
          queue.push(dinVal);
        }
      }

      runtime.queue = queue;
      runtime.lastDout = lastDout;
      runtime.previousClock = clock;

      const outputs: SignalValue[] = [];
      for (let i = 0; i < dataWidth; i++) {
        outputs.push(((lastDout >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
      outputs.push(queue.length === 0 ? SignalValue.HIGH : SignalValue.LOW); // EMPTY
      outputs.push(queue.length >= depth ? SignalValue.HIGH : SignalValue.LOW); // FULL
      return outputs;
    }

    if (component.type === 'STACK' || component.type === 'LIFO') {
      const dataWidth = (props['dataWidth'] as number) ?? 8;
      const depth = (props['depth'] as number) ?? 16;
      const clock = inputs[0] ?? SignalValue.LOW;
      const push = inputs[1] === SignalValue.HIGH;
      const pop = inputs[2] === SignalValue.HIGH;
      const rst = inputs[3] === SignalValue.HIGH;
      const dinBits = inputs.slice(4, 4 + dataWidth).map(v => (v === SignalValue.HIGH ? 1 : 0) as number);
      const dinVal = dinBits.reduce((acc: number, bit: number, idx: number) => acc + (bit << idx), 0 as number);

      let stack = (runtime.stack as number[] | undefined) ?? [];
      let lastDout = (runtime.lastDout as number | undefined) ?? 0;

      if (rst) {
        stack = [];
        lastDout = 0;
      } else if (runtime.previousClock !== SignalValue.HIGH && clock === SignalValue.HIGH) {
        if (pop && stack.length > 0) {
          lastDout = stack.pop()!;
        }
        if (push && stack.length < depth) {
          stack.push(dinVal);
        }
      }

      runtime.stack = stack;
      runtime.lastDout = lastDout;
      runtime.previousClock = clock;

      const outputs: SignalValue[] = [];
      for (let i = 0; i < dataWidth; i++) {
        outputs.push(((lastDout >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
      outputs.push(stack.length === 0 ? SignalValue.HIGH : SignalValue.LOW); // EMPTY
      outputs.push(stack.length >= depth ? SignalValue.HIGH : SignalValue.LOW); // FULL
      return outputs;
    }

    return this.registry.evaluate(component.type, inputs, props);
  }

  private detectHazard(pinId: string, _value: SignalValue): void {
    const history = this.pinHistory.get(pinId);
    if (!history || history.length < 2) return;
    const recent = history.slice(-8);
    const transitions = recent.reduce((count, val, i) => {
      if (i > 0 && val !== recent[i - 1]) return count + 1;
      return count;
    }, 0);
    if (transitions >= 2) {
      const compId = this.findComponentIdForPin(pinId);
      const lastReport = this.hazardReports[this.hazardReports.length - 1];
      if (lastReport?.tick === this.state.tick && lastReport?.componentId === compId) return;
      this.oscillationReports.push({ tick: this.state.tick, componentIds: [compId], period: this.state.tick });
      this.hazardReports.push({ tick: this.state.tick, componentId: compId, description: `Oscillation detected on pin ${pinId} (${transitions} transitions)`, severity: 'warning' });
    }
  }

  private findPin(pinId: string): Pin | undefined {
    for (const comp of this.components.values()) {
      const pin = comp.pins.find(p => p.id === pinId);
      if (pin) return pin;
    }
    return undefined;
  }

  private findComponentIdForPin(pinId: string): string {
    for (const [compId, comp] of this.components) {
      if (comp.pins.some(p => p.id === pinId)) return compId;
    }
    return 'unknown';
  }

  getState(): Readonly<SimulationState> { return { ...this.state }; }
  getPinValue(pinId: string): SignalValue {
    // pinValues is now kept fully resolved (including input pins) by resolveAllNets()
    return this.pinValues.get(pinId) ?? SignalValue.UNKNOWN;
  }
  getWireValue(wireId: string): SignalValue { return this.wireValues.get(wireId) ?? SignalValue.UNKNOWN; }

  /**
   * Returns ALL pin values including net-resolved input pin values.
   * This is the authoritative snapshot consumed by the renderer.
   */
  getAllPinValues(): ReadonlyMap<string, SignalValue> { return new Map(this.pinValues); }
  getAllWireValues(): ReadonlyMap<string, SignalValue> { return new Map(this.wireValues); }
  getHazards(): ReadonlyArray<HazardReport> { return [...this.hazardReports]; }
  getOscillations(): ReadonlyArray<OscillationReport> { return [...this.oscillationReports]; }
}

export function registerBuiltInLogics(registry: ComponentLogicRegistry): void {
  // Logic Gates (True 4-value digital logic with unknown propagation)
  registry.register('AND', (inputs) => {
    if (inputs.some(v => v === SignalValue.LOW)) return [SignalValue.LOW];
    if (inputs.some(v => v === SignalValue.ERROR)) return [SignalValue.ERROR];
    if (inputs.some(v => v === SignalValue.UNKNOWN || v === SignalValue.FLOATING)) return [SignalValue.UNKNOWN];
    return [inputs.every(v => v === SignalValue.HIGH) ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('OR', (inputs) => {
    if (inputs.some(v => v === SignalValue.HIGH)) return [SignalValue.HIGH];
    if (inputs.some(v => v === SignalValue.ERROR)) return [SignalValue.ERROR];
    if (inputs.some(v => v === SignalValue.UNKNOWN || v === SignalValue.FLOATING)) return [SignalValue.UNKNOWN];
    return [inputs.every(v => v === SignalValue.LOW) ? SignalValue.LOW : SignalValue.HIGH];
  });

  registry.register('NOT', (inputs) => {
    const val = inputs[0] ?? SignalValue.UNKNOWN;
    if (val === SignalValue.HIGH) return [SignalValue.LOW];
    if (val === SignalValue.LOW) return [SignalValue.HIGH];
    if (val === SignalValue.ERROR) return [SignalValue.ERROR];
    return [SignalValue.UNKNOWN];
  });

  registry.register('NAND', (inputs) => {
    if (inputs.some(v => v === SignalValue.LOW)) return [SignalValue.HIGH];
    if (inputs.some(v => v === SignalValue.ERROR)) return [SignalValue.ERROR];
    if (inputs.some(v => v === SignalValue.UNKNOWN || v === SignalValue.FLOATING)) return [SignalValue.UNKNOWN];
    return [inputs.every(v => v === SignalValue.HIGH) ? SignalValue.LOW : SignalValue.HIGH];
  });

  registry.register('NOR', (inputs) => {
    if (inputs.some(v => v === SignalValue.HIGH)) return [SignalValue.LOW];
    if (inputs.some(v => v === SignalValue.ERROR)) return [SignalValue.ERROR];
    if (inputs.some(v => v === SignalValue.UNKNOWN || v === SignalValue.FLOATING)) return [SignalValue.UNKNOWN];
    return [inputs.every(v => v === SignalValue.LOW) ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('XOR', (inputs) => {
    if (inputs.length < 2) return [SignalValue.ERROR];
    if (inputs.some(v => v === SignalValue.ERROR)) return [SignalValue.ERROR];
    if (inputs.some(v => v === SignalValue.UNKNOWN || v === SignalValue.FLOATING)) return [SignalValue.UNKNOWN];
    const highCount = inputs.filter(v => v === SignalValue.HIGH).length;
    return [highCount % 2 === 1 ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('XNOR', (inputs) => {
    if (inputs.length < 2) return [SignalValue.ERROR];
    if (inputs.some(v => v === SignalValue.ERROR)) return [SignalValue.ERROR];
    if (inputs.some(v => v === SignalValue.UNKNOWN || v === SignalValue.FLOATING)) return [SignalValue.UNKNOWN];
    const highCount = inputs.filter(v => v === SignalValue.HIGH).length;
    return [highCount % 2 === 0 ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('BUFFER', (inputs) => {
    const val = inputs[0] ?? SignalValue.UNKNOWN;
    if (val === SignalValue.HIGH) return [SignalValue.HIGH];
    if (val === SignalValue.LOW) return [SignalValue.LOW];
    if (val === SignalValue.ERROR) return [SignalValue.ERROR];
    return [SignalValue.UNKNOWN];
  });

  registry.register('TRI_STATE_BUFFER', (inputs) => {
    const data = inputs[0] ?? SignalValue.UNKNOWN;
    const enable = inputs[1] ?? SignalValue.LOW;
    if (enable === SignalValue.HIGH) return [data];
    return [SignalValue.FLOATING];
  });

  // Inputs, Constants & Signal Generators
  registry.register('SWITCH', (_inputs, props) => {
    const isOn = props['isOn'] as boolean ?? false;
    return [isOn ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('PUSH_BUTTON', (_inputs, props) => {
    const isPressed = props['isPressed'] as boolean ?? false;
    return [isPressed ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('CLOCK', (_inputs, props) => {
    const state = props['state'] as boolean ?? false;
    return [state ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('CONSTANT', (_inputs, props) => {
    const value = props['value'];
    const on = value === 1 || value === true || value === SignalValue.HIGH;
    return [on ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('CONSTANT_0', () => [SignalValue.LOW]);
  registry.register('CONSTANT_1', () => [SignalValue.HIGH]);

  registry.register('RESULT_CONSTANT', (_inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const rawVal = (props['value'] as number) ?? 0;
    const outBits: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outBits.push(((rawVal >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outBits;
  });

  // Latches & Flip-Flops
  registry.register('SR_LATCH', (inputs, props) => {
    const s = inputs[0] ?? SignalValue.LOW;
    const r = inputs[1] ?? SignalValue.LOW;
    let q = (props['q'] as SignalValue) ?? SignalValue.LOW;
    if (s === SignalValue.HIGH && r === SignalValue.HIGH) return [SignalValue.ERROR, SignalValue.ERROR];
    if (s === SignalValue.HIGH) q = SignalValue.HIGH;
    else if (r === SignalValue.HIGH) q = SignalValue.LOW;
    return [q, q === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
  });

  registry.register('D_LATCH', (inputs, props) => {
    const d = inputs[0] ?? SignalValue.LOW;
    const en = inputs[1] ?? SignalValue.LOW;
    let q = (props['q'] as SignalValue) ?? SignalValue.LOW;
    if (en === SignalValue.HIGH) q = d;
    return [q, q === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
  });

  registry.register('D_FLIPFLOP', (_inputs, props) => {
    const stored = (props['stored'] as SignalValue) ?? SignalValue.LOW;
    return [stored, stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
  });

  registry.register('JK_FLIPFLOP', (_inputs, props) => {
    const stored = (props['stored'] as SignalValue) ?? SignalValue.LOW;
    return [stored, stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
  });

  registry.register('T_FLIPFLOP', (_inputs, props) => {
    const stored = (props['stored'] as SignalValue) ?? SignalValue.LOW;
    return [stored, stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
  });

  registry.register('REGISTER', (_inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    return (props['storedValues'] as SignalValue[]) ?? Array(bitWidth).fill(SignalValue.LOW);
  });

  registry.register('COUNTER', (_inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const count = (props['count'] as number) ?? 0;
    const outputs: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outputs.push(((count >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outputs;
  });

  registry.register('RAM', (_inputs, props) => {
    const dataWidth = (props['dataWidth'] as number) ?? 8;
    return Array(dataWidth).fill(SignalValue.LOW);
  });

  registry.register('ROM', (inputs, props) => {
    const addrWidth = (props['addrWidth'] as number) ?? 4;
    const dataWidth = (props['dataWidth'] as number) ?? 8;
    const romData = (props['romData'] as number[]) ?? Array(1 << addrWidth).fill(0);

    const addrBits: number[] = inputs.slice(0, addrWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const addr = addrBits.reduce((acc, bit, idx) => acc + (bit << idx), 0);

    const val = romData[addr] ?? 0;
    const outputs: SignalValue[] = [];
    for (let i = 0; i < dataWidth; i++) {
      outputs.push(((val >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outputs;
  });

  // Arithmetic Units
  registry.register('HALF_ADDER', (inputs) => {
    const a = inputs[0] === SignalValue.HIGH ? 1 : 0;
    const b = inputs[1] === SignalValue.HIGH ? 1 : 0;
    const sum = a ^ b;
    const carry = a & b;
    return [sum === 1 ? SignalValue.HIGH : SignalValue.LOW, carry === 1 ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('FULL_ADDER', (inputs) => {
    const a = inputs[0] === SignalValue.HIGH ? 1 : 0;
    const b = inputs[1] === SignalValue.HIGH ? 1 : 0;
    const cin = inputs[2] === SignalValue.HIGH ? 1 : 0;
    const total = a + b + cin;
    const sum = total & 1;
    const cout = (total >> 1) & 1;
    return [sum === 1 ? SignalValue.HIGH : SignalValue.LOW, cout === 1 ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('ADDER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bBits: number[] = inputs.slice(bitWidth, bitWidth * 2).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const cin = (inputs[bitWidth * 2] === SignalValue.HIGH ? 1 : 0);

    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const valB = bBits.reduce((acc, b, i) => acc + (b << i), 0);
    const sumTotal = valA + valB + cin;

    const outputs: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outputs.push(((sumTotal >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    const cout = ((sumTotal >> bitWidth) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW;
    outputs.push(cout);
    return outputs;
  });

  registry.register('SUBTRACTOR', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bBits: number[] = inputs.slice(bitWidth, bitWidth * 2).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bin = (inputs[bitWidth * 2] === SignalValue.HIGH ? 1 : 0);

    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const valB = bBits.reduce((acc, b, i) => acc + (b << i), 0);
    const diffTotal = valA - valB - bin;

    const mask = (1 << bitWidth) - 1;
    const resultVal = diffTotal & mask;
    const bout = diffTotal < 0 ? SignalValue.HIGH : SignalValue.LOW;

    const outputs: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outputs.push(((resultVal >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    outputs.push(bout);
    return outputs;
  });

  registry.register('ADDER_SUBTRACTOR', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bBits: number[] = inputs.slice(bitWidth, bitWidth * 2).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const sub = inputs[bitWidth * 2] === SignalValue.HIGH;
    const cin = inputs[bitWidth * 2 + 1] === SignalValue.HIGH ? 1 : 0;

    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const valB = bBits.reduce((acc, b, i) => acc + (b << i), 0);

    const mask = (1 << bitWidth) - 1;
    const outputs: SignalValue[] = [];

    if (sub) {
      const diffTotal = valA - valB - cin;
      const resultVal = diffTotal & mask;
      for (let i = 0; i < bitWidth; i++) {
        outputs.push(((resultVal >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
      outputs.push(diffTotal < 0 ? SignalValue.HIGH : SignalValue.LOW);
    } else {
      const sumTotal = valA + valB + cin;
      for (let i = 0; i < bitWidth; i++) {
        outputs.push(((sumTotal >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
      outputs.push(((sumTotal >> bitWidth) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outputs;
  });

  registry.register('COMPARATOR', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bBits: number[] = inputs.slice(bitWidth, bitWidth * 2).map(v => (v === SignalValue.HIGH ? 1 : 0));

    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const valB = bBits.reduce((acc, b, i) => acc + (b << i), 0);

    const gt = valA > valB ? SignalValue.HIGH : SignalValue.LOW;
    const eq = valA === valB ? SignalValue.HIGH : SignalValue.LOW;
    const lt = valA < valB ? SignalValue.HIGH : SignalValue.LOW;

    return [gt, eq, lt];
  });

  registry.register('ALU', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bBits: number[] = inputs.slice(bitWidth, bitWidth * 2).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const opBits: number[] = inputs.slice(bitWidth * 2, bitWidth * 2 + 3).map(v => (v === SignalValue.HIGH ? 1 : 0));

    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const valB = bBits.reduce((acc, b, i) => acc + (b << i), 0);
    const op = opBits.reduce((acc, b, i) => acc + (b << i), 0);

    let res = 0;
    switch (op) {
      case 0: res = valA + valB; break; // ADD
      case 1: res = valA - valB; break; // SUB
      case 2: res = valA & valB; break; // AND
      case 3: res = valA | valB; break; // OR
      case 4: res = valA ^ valB; break; // XOR
      case 5: res = ~valA; break;      // NOT A
      case 6: res = valA << 1; break;  // SHL
      case 7: res = valA >> 1; break;  // SHR
    }

    const mask = (1 << bitWidth) - 1;
    const maskedRes = res & mask;
    const zero = maskedRes === 0 ? SignalValue.HIGH : SignalValue.LOW;
    const neg = ((maskedRes >> (bitWidth - 1)) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW;

    const outputs: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outputs.push(((maskedRes >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    outputs.push(zero, neg);
    return outputs;
  });

  // Plexers
  registry.register('MULTIPLEXER', (inputs, props) => {
    const selBitsCount = (props['selBits'] as number) ?? 1;
    const dataInputsCount = 1 << selBitsCount;

    const dataInputs = inputs.slice(0, dataInputsCount);
    const selBits: number[] = inputs.slice(dataInputsCount, dataInputsCount + selBitsCount).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const selIndex = selBits.reduce((acc, b, i) => acc + (b << i), 0);

    return [dataInputs[selIndex] ?? SignalValue.UNKNOWN];
  });

  registry.register('DEMULTIPLEXER', (inputs, props) => {
    const selBitsCount = (props['selBits'] as number) ?? 1;
    const outCount = 1 << selBitsCount;
    const dataIn = inputs[0] ?? SignalValue.UNKNOWN;
    const selBits: number[] = inputs.slice(1, 1 + selBitsCount).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const selIndex = selBits.reduce((acc, b, i) => acc + (b << i), 0);

    const outputs: SignalValue[] = Array(outCount).fill(SignalValue.LOW);
    outputs[selIndex] = dataIn;
    return outputs;
  });

  registry.register('ENCODER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 2;
    const inputCount = 1 << bitWidth;
    const activeIndex = inputs.slice(0, inputCount).findIndex(v => v === SignalValue.HIGH);

    const val = activeIndex >= 0 ? activeIndex : 0;
    const outputs: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outputs.push(((val >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outputs;
  });

  registry.register('DECODER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 2;
    const outputCount = 1 << bitWidth;
    const inBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const selIndex = inBits.reduce((acc, b, i) => acc + (b << i), 0);

    const outputs: SignalValue[] = Array(outputCount).fill(SignalValue.LOW);
    outputs[selIndex] = SignalValue.HIGH;
    return outputs;
  });

  registry.register('MULTIPLIER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bBits: number[] = inputs.slice(bitWidth, bitWidth * 2).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const valB = bBits.reduce((acc, b, i) => acc + (b << i), 0);
    const prod = valA * valB;
    const outBits: SignalValue[] = [];
    for (let i = 0; i < bitWidth * 2; i++) {
      outBits.push(((prod >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outBits;
  });

  registry.register('DIVIDER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bBits: number[] = inputs.slice(bitWidth, bitWidth * 2).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const valB = bBits.reduce((acc, b, i) => acc + (b << i), 0);
    if (valB === 0) {
      const qZeros = Array(bitWidth).fill(SignalValue.LOW);
      const rZeros = Array(bitWidth).fill(SignalValue.LOW);
      return [...qZeros, ...rZeros, SignalValue.HIGH]; // ERR=HIGH
    }
    const quot = Math.floor(valA / valB);
    const rem = valA % valB;
    const qBits: SignalValue[] = [];
    const rBits: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      qBits.push(((quot >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      rBits.push(((rem >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return [...qBits, ...rBits, SignalValue.LOW]; // ERR=LOW
  });

  registry.register('INCREMENTER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const cin = inputs[bitWidth] === SignalValue.HIGH ? 1 : 0;
    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const sum = valA + 1 + cin;
    const outBits: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outBits.push(((sum >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    const cout = ((sum >> bitWidth) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW;
    outBits.push(cout);
    return outBits;
  });

  registry.register('DECREMENTER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bin = inputs[bitWidth] === SignalValue.HIGH ? 1 : 0;
    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const diff = valA - 1 - bin;
    const mask = (1 << bitWidth) - 1;
    const result = diff & mask;
    const outBits: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outBits.push(((result >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    outBits.push(diff < 0 ? SignalValue.HIGH : SignalValue.LOW);
    return outBits;
  });

  registry.register('NEGATOR', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const valA = aBits.reduce((acc, b, i) => acc + (b << i), 0);
    const mask = (1 << bitWidth) - 1;
    const neg = (-valA) & mask;
    const outBits: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outBits.push(((neg >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outBits;
  });

  // Plexers
  registry.register('PRIORITY_ENCODER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 2;
    const inCount = 1 << bitWidth;
    let highestActive = -1;
    for (let i = inCount - 1; i >= 0; i--) {
      if (inputs[i] === SignalValue.HIGH) {
        highestActive = i;
        break;
      }
    }
    const val = highestActive >= 0 ? highestActive : 0;
    const outBits: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outBits.push(((val >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    outBits.push(highestActive >= 0 ? SignalValue.HIGH : SignalValue.LOW); // ANY
    return outBits;
  });

  // Inputs, Outputs & Pins
  registry.register('INPUT_PIN', (_inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 1;
    const rawVal = typeof props['value'] === 'number' ? props['value'] : (props['value'] === true ? 1 : 0);
    const outBits: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outBits.push(((rawVal >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outBits;
  });

  registry.register('OUTPUT_PIN', (inputs) => inputs);
  registry.register('PROBE', (inputs) => inputs);

  registry.register('BIT_SELECTOR', (inputs, props) => {
    const bitIndex = (props['bitIndex'] as number) ?? 0;
    return [inputs[bitIndex] ?? SignalValue.LOW];
  });

  registry.register('HALF_SUBTRACTOR', (inputs) => {
    const a = inputs[0] === SignalValue.HIGH ? 1 : 0;
    const b = inputs[1] === SignalValue.HIGH ? 1 : 0;
    const diff = a ^ b;
    const bout = (!a && b) ? 1 : 0;
    return [diff === 1 ? SignalValue.HIGH : SignalValue.LOW, bout === 1 ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('FULL_SUBTRACTOR', (inputs) => {
    const a = inputs[0] === SignalValue.HIGH ? 1 : 0;
    const b = inputs[1] === SignalValue.HIGH ? 1 : 0;
    const bin = inputs[2] === SignalValue.HIGH ? 1 : 0;
    const diff = a ^ b ^ bin;
    const bout = ((!a && b) || (!(a ^ b) && bin)) ? 1 : 0;
    return [diff === 1 ? SignalValue.HIGH : SignalValue.LOW, bout === 1 ? SignalValue.HIGH : SignalValue.LOW];
  });

  registry.register('CARRY_LOOKAHEAD_ADDER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const aBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bBits: number[] = inputs.slice(bitWidth, bitWidth * 2).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const cin = inputs[bitWidth * 2] === SignalValue.HIGH ? 1 : 0;

    let c = cin;
    const sumBits: SignalValue[] = [];
    let pGroup = 1;
    let gGroup = 0;

    for (let i = 0; i < bitWidth; i++) {
      const a = aBits[i] ?? 0;
      const b = bBits[i] ?? 0;
      const p = a ^ b;
      const g = a & b;
      sumBits.push((p ^ c) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      c = g | (p & c);
      pGroup &= p;
      if (i === bitWidth - 1) gGroup = g;
    }

    return [
      ...sumBits,
      c === 1 ? SignalValue.HIGH : SignalValue.LOW, // Cout
      pGroup === 1 ? SignalValue.HIGH : SignalValue.LOW, // Propagate Group
      gGroup === 1 ? SignalValue.HIGH : SignalValue.LOW, // Generate Group
    ];
  });

  registry.register('BCD_TO_7SEG', (inputs) => {
    const d0 = inputs[0] === SignalValue.HIGH ? 1 : 0;
    const d1 = inputs[1] === SignalValue.HIGH ? 1 : 0;
    const d2 = inputs[2] === SignalValue.HIGH ? 1 : 0;
    const d3 = inputs[3] === SignalValue.HIGH ? 1 : 0;
    const lt = inputs[4] === SignalValue.HIGH; // Lamp Test: all ON

    if (lt) {
      return Array(7).fill(SignalValue.HIGH);
    }

    const val = d0 | (d1 << 1) | (d2 << 2) | (d3 << 3);
    // 7-segment encoding: a, b, c, d, e, f, g for digits 0-9
    const SEGMENTS: Record<number, number[]> = {
      0: [1, 1, 1, 1, 1, 1, 0],
      1: [0, 1, 1, 0, 0, 0, 0],
      2: [1, 1, 0, 1, 1, 0, 1],
      3: [1, 1, 1, 1, 0, 0, 1],
      4: [0, 1, 1, 0, 0, 1, 1],
      5: [1, 0, 1, 1, 0, 1, 1],
      6: [1, 0, 1, 1, 1, 1, 1],
      7: [1, 1, 1, 0, 0, 0, 0],
      8: [1, 1, 1, 1, 1, 1, 1],
      9: [1, 1, 1, 1, 0, 1, 1],
    };

    const pattern = SEGMENTS[val] ?? [0, 0, 0, 0, 0, 0, 0];
    return pattern.map(bit => (bit === 1 ? SignalValue.HIGH : SignalValue.LOW));
  });

  registry.register('GRAY_ENCODER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const bBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const gBits: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      const current = bBits[i] ?? 0;
      const next = i < bitWidth - 1 ? (bBits[i + 1] ?? 0) : 0;
      gBits.push((current ^ next) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return gBits;
  });

  registry.register('GRAY_DECODER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const gBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const bBits: number[] = Array(bitWidth).fill(0);
    // MSB is same
    let acc = gBits[bitWidth - 1] ?? 0;
    bBits[bitWidth - 1] = acc;
    for (let i = bitWidth - 2; i >= 0; i--) {
      acc = acc ^ (gBits[i] ?? 0);
      bBits[i] = acc;
    }
    return bBits.map(b => (b === 1 ? SignalValue.HIGH : SignalValue.LOW));
  });

  registry.register('BCD_ENCODER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const inBits: number[] = inputs.slice(0, bitWidth).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const val = inBits.reduce((acc, bit, idx) => acc + (bit << idx), 0);
    const bcdDigits = Math.ceil(bitWidth / 3);
    const outSignals: SignalValue[] = [];

    let temp = val;
    for (let d = 0; d < bcdDigits; d++) {
      const digit = temp % 10;
      temp = Math.floor(temp / 10);
      for (let b = 0; b < 4; b++) {
        outSignals.push(((digit >> b) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
      }
    }
    return outSignals;
  });

  registry.register('BCD_DECODER', (inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const bcdBits: number[] = inputs.slice(0, 8).map(v => (v === SignalValue.HIGH ? 1 : 0));
    const digit0 = (bcdBits[0] ?? 0) | ((bcdBits[1] ?? 0) << 1) | ((bcdBits[2] ?? 0) << 2) | ((bcdBits[3] ?? 0) << 3);
    const digit1 = (bcdBits[4] ?? 0) | ((bcdBits[5] ?? 0) << 1) | ((bcdBits[6] ?? 0) << 2) | ((bcdBits[7] ?? 0) << 3);
    const binaryVal = (digit1 * 10 + digit0) & ((1 << bitWidth) - 1);

    const outSignals: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outSignals.push(((binaryVal >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outSignals;
  });

  registry.register('SR_FLIPFLOP', (_inputs, props) => {
    const stored = (props['stored'] as SignalValue) ?? SignalValue.LOW;
    return [stored, stored === SignalValue.HIGH ? SignalValue.LOW : SignalValue.HIGH];
  });

  registry.register('DECADE_COUNTER', (_inputs, props) => {
    const count = (props['count'] as number) ?? 0;
    return [
      ((count >> 0) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW,
      ((count >> 1) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW,
      ((count >> 2) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW,
      ((count >> 3) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW,
      count === 9 ? SignalValue.HIGH : SignalValue.LOW,
    ];
  });

  registry.register('RING_COUNTER', (_inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const pattern = (props['pattern'] as number) ?? 1;
    const outputs: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outputs.push(((pattern >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outputs;
  });

  registry.register('JOHNSON_COUNTER', (_inputs, props) => {
    const bitWidth = (props['bitWidth'] as number) ?? 4;
    const pattern = (props['pattern'] as number) ?? 0;
    const outputs: SignalValue[] = [];
    for (let i = 0; i < bitWidth; i++) {
      outputs.push(((pattern >> i) & 1) === 1 ? SignalValue.HIGH : SignalValue.LOW);
    }
    return outputs;
  });

  registry.register('FIFO', (_inputs, props) => {
    const dataWidth = (props['dataWidth'] as number) ?? 8;
    return [...Array(dataWidth).fill(SignalValue.LOW), SignalValue.HIGH, SignalValue.LOW];
  });

  registry.register('STACK', (_inputs, props) => {
    const dataWidth = (props['dataWidth'] as number) ?? 8;
    return [...Array(dataWidth).fill(SignalValue.LOW), SignalValue.HIGH, SignalValue.LOW];
  });

  registry.register('LIFO', (_inputs, props) => {
    const dataWidth = (props['dataWidth'] as number) ?? 8;
    return [...Array(dataWidth).fill(SignalValue.LOW), SignalValue.HIGH, SignalValue.LOW];
  });

  registry.register('BUS_TAP', (inputs, props) => {
    const tapIndex = (props['tapIndex'] as number) ?? 0;
    return [inputs[tapIndex] ?? SignalValue.LOW];
  });

  // Routing & Bus Connectors
  registry.register('SPLITTER', (inputs) => inputs);
  registry.register('MERGER', (inputs) => inputs);
  registry.register('TUNNEL', (inputs) => [inputs[0] ?? SignalValue.UNKNOWN]);
  registry.register('SUBCIRCUIT', (inputs) => inputs);
}
