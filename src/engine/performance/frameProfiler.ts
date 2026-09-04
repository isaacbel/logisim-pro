/**
 * Frame Profiler — Rolling FPS and frame-time averages.
 * Used by the canvas renderer to track performance over time.
 */

const WINDOW = 60; // frames to average over

export class FrameProfiler {
  private times: number[] = [];
  private last = 0;

  /** Call at the start of each frame. Returns elapsed ms since last call. */
  tick(): number {
    const now = performance.now();
    const dt = this.last > 0 ? now - this.last : 0;
    this.last = now;

    if (dt > 0) {
      this.times.push(dt);
      if (this.times.length > WINDOW) this.times.shift();
    }
    return dt;
  }

  /** Average FPS over the rolling window. */
  get fps(): number {
    if (this.times.length === 0) return 0;
    const avg = this.times.reduce((a, b) => a + b, 0) / this.times.length;
    return avg > 0 ? Math.min(999, Math.round(1000 / avg)) : 0;
  }

  /** Average frame time in ms over the rolling window. */
  get frameTime(): number {
    if (this.times.length === 0) return 0;
    return this.times.reduce((a, b) => a + b, 0) / this.times.length;
  }

  /** Minimum frame time in window (best frame). */
  get minFrameTime(): number {
    return this.times.length > 0 ? Math.min(...this.times) : 0;
  }

  /** Maximum frame time in window (worst frame). */
  get maxFrameTime(): number {
    return this.times.length > 0 ? Math.max(...this.times) : 0;
  }

  reset(): void {
    this.times = [];
    this.last = 0;
  }
}
