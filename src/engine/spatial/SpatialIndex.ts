/**
 * Grid-based Spatial Hash Index.
 *
 * Divides world space into cells of `cellSize`. Each object is inserted into
 * all cells its AABB overlaps. Queries return candidate IDs from all cells
 * that overlap the query AABB (with dedup). O(1) average for small objects.
 *
 * Use this for:
 * - Component hit testing
 * - Wire selection
 * - Viewport culling
 * - Obstacle lookup in wire router
 */
import { AABB, aabbIntersects } from './AABB';

export class SpatialIndex {
  private cellSize: number;
  private cells: Map<number, Set<string>> = new Map();
  private objects: Map<string, AABB> = new Map();

  constructor(cellSize = 100) {
    this.cellSize = cellSize;
  }

  private cellKey(cx: number, cy: number): number {
    // Cantor pairing for integer grid coords → single integer key
    const x = cx + 32768;
    const y = cy + 32768;
    return x * 65536 + y;
  }

  private cellsForAABB(aabb: AABB): Array<[number, number]> {
    const cs = this.cellSize;
    const x0 = Math.floor(aabb.x / cs);
    const y0 = Math.floor(aabb.y / cs);
    const x1 = Math.floor((aabb.x + aabb.w) / cs);
    const y1 = Math.floor((aabb.y + aabb.h) / cs);
    const result: Array<[number, number]> = [];
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        result.push([cx, cy]);
      }
    }
    return result;
  }

  /** Insert an object with the given ID and bounding box. */
  insert(id: string, aabb: AABB): void {
    this.objects.set(id, aabb);
    for (const [cx, cy] of this.cellsForAABB(aabb)) {
      const key = this.cellKey(cx, cy);
      let cell = this.cells.get(key);
      if (!cell) { cell = new Set(); this.cells.set(key, cell); }
      cell.add(id);
    }
  }

  /** Remove an object by ID. */
  remove(id: string): void {
    const aabb = this.objects.get(id);
    if (!aabb) return;
    this.objects.delete(id);
    for (const [cx, cy] of this.cellsForAABB(aabb)) {
      const key = this.cellKey(cx, cy);
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) this.cells.delete(key);
      }
    }
  }

  /** Update the AABB of an existing object (remove + re-insert). */
  update(id: string, aabb: AABB): void {
    this.remove(id);
    this.insert(id, aabb);
  }

  /**
   * Query all object IDs whose bounding box intersects the given AABB.
   * Returns a Set of IDs (deduped).
   */
  query(aabb: AABB): Set<string> {
    const result = new Set<string>();
    for (const [cx, cy] of this.cellsForAABB(aabb)) {
      const cell = this.cells.get(this.cellKey(cx, cy));
      if (!cell) continue;
      for (const id of cell) {
        if (result.has(id)) continue;
        const objAABB = this.objects.get(id);
        if (objAABB && aabbIntersects(aabb, objAABB)) {
          result.add(id);
        }
      }
    }
    return result;
  }

  /**
   * Query the single nearest object to a point, within maxRadius world units.
   * Returns null if nothing found.
   */
  queryNearest(px: number, py: number, maxRadius: number): string | null {
    const queryBox: AABB = {
      x: px - maxRadius, y: py - maxRadius,
      w: maxRadius * 2, h: maxRadius * 2,
    };
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const id of this.query(queryBox)) {
      const box = this.objects.get(id)!;
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist < bestDist) { bestDist = dist; bestId = id; }
    }
    return bestId;
  }

  /** Get the stored AABB of an object. */
  getAABB(id: string): AABB | undefined {
    return this.objects.get(id);
  }

  /** Number of indexed objects. */
  get size(): number {
    return this.objects.size;
  }

  /** Remove all objects. */
  clear(): void {
    this.cells.clear();
    this.objects.clear();
  }

  /** Rebuild the entire index from a list of {id, aabb} entries. */
  rebuild(entries: Array<{ id: string; aabb: AABB }>): void {
    this.clear();
    for (const { id, aabb } of entries) {
      this.insert(id, aabb);
    }
  }
}
