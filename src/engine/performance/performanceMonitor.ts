/**
 * Performance Monitor — Development-only instrumentation.
 * Stripped in production via import.meta.env.DEV guard.
 * No React dependency; pure singleton class.
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;       // ms
  renderTime: number;      // ms per frame
  simulationTime: number;  // ms per tick
  routingTime: number;     // ms last reroute
  componentCount: number;
  wireCount: number;
  activeNets: number;
  reactRenderCount: number;
  workerExecutionTime: number; // ms
  culledComponents: number;
  cacheHits: number;
  cacheMisses: number;
  drawCalls: number;
}

const EMPTY_METRICS: PerformanceMetrics = {
  fps: 0, frameTime: 0, renderTime: 0, simulationTime: 0,
  routingTime: 0, componentCount: 0, wireCount: 0, activeNets: 0,
  reactRenderCount: 0, workerExecutionTime: 0, culledComponents: 0,
  cacheHits: 0, cacheMisses: 0, drawCalls: 0,
};

class PerformanceMonitor {
  private metrics: PerformanceMetrics = { ...EMPTY_METRICS };
  private listeners: Set<(m: PerformanceMetrics) => void> = new Set();
  private enabled = import.meta.env.DEV;

  get isEnabled(): boolean { return this.enabled; }

  /** Enable/disable at runtime (e.g. from dev overlay toggle) */
  setEnabled(on: boolean): void { this.enabled = on; }

  update(partial: Partial<PerformanceMetrics>): void {
    if (!this.enabled) return;
    this.metrics = { ...this.metrics, ...partial };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  subscribe(cb: (m: PerformanceMetrics) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Call this once per frame to publish metrics to listeners */
  flush(): void {
    if (!this.enabled || this.listeners.size === 0) return;
    const snapshot = { ...this.metrics };
    this.listeners.forEach(cb => cb(snapshot));
  }

  /** Record a timed operation. Returns elapsed ms. */
  time<T>(key: keyof PerformanceMetrics, fn: () => T): T {
    if (!this.enabled) return fn();
    const t0 = performance.now();
    const result = fn();
    const elapsed = performance.now() - t0;
    this.update({ [key]: elapsed } as Partial<PerformanceMetrics>);
    return result;
  }

  /** Async variant of time() */
  async timeAsync<T>(key: keyof PerformanceMetrics, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();
    const t0 = performance.now();
    const result = await fn();
    const elapsed = performance.now() - t0;
    this.update({ [key]: elapsed } as Partial<PerformanceMetrics>);
    return result;
  }

  reset(): void {
    this.metrics = { ...EMPTY_METRICS };
  }
}

export const performanceMonitor = new PerformanceMonitor();
