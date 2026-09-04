/**
 * Render Profiler — Tracks draw call counts, culling stats, and cache hits.
 * Dev-only. Resets counters at the start of each frame.
 */

export interface RenderFrameStats {
  drawCalls: number;
  culledComponents: number;
  culledWires: number;
  cacheHits: number;
  cacheMisses: number;
  staticLayerRedraws: number;
}

export class RenderProfiler {
  private _drawCalls = 0;
  private _culledComponents = 0;
  private _culledWires = 0;
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _staticLayerRedraws = 0;

  // ── Counters ──────────────────────────────────────────────────────────────
  incDrawCalls(n = 1): void { this._drawCalls += n; }
  incCulledComponents(n = 1): void { this._culledComponents += n; }
  incCulledWires(n = 1): void { this._culledWires += n; }
  incCacheHit(): void { this._cacheHits++; }
  incCacheMiss(): void { this._cacheMisses++; }
  incStaticLayerRedraw(): void { this._staticLayerRedraws++; }

  // ── Getters ───────────────────────────────────────────────────────────────
  get drawCalls(): number { return this._drawCalls; }
  get culledComponents(): number { return this._culledComponents; }
  get culledWires(): number { return this._culledWires; }
  get cacheHits(): number { return this._cacheHits; }
  get cacheMisses(): number { return this._cacheMisses; }
  get staticLayerRedraws(): number { return this._staticLayerRedraws; }

  get cacheHitRate(): number {
    const total = this._cacheHits + this._cacheMisses;
    return total > 0 ? this._cacheHits / total : 0;
  }

  snapshot(): RenderFrameStats {
    return {
      drawCalls: this._drawCalls,
      culledComponents: this._culledComponents,
      culledWires: this._culledWires,
      cacheHits: this._cacheHits,
      cacheMisses: this._cacheMisses,
      staticLayerRedraws: this._staticLayerRedraws,
    };
  }

  /** Reset all counters — call at start of each frame. */
  reset(): void {
    this._drawCalls = 0;
    this._culledComponents = 0;
    this._culledWires = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._staticLayerRedraws = 0;
  }
}
