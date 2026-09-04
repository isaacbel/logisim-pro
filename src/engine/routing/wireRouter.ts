/**
 * Authoritative Orthogonal & Multi-Style Wire Router for Logisim Pro
 *
 * Supports:
 * - Straight (Direct)
 * - L-Shape (Horizontal-First & Vertical-First)
 * - Z-Shape (Midpoint Manhattan)
 * - 45° Diagonal / Chamfered Corners
 * - Multi-segment Custom Paths with Waypoints
 * - Obstacle Avoidance Routing (Components as obstacles)
 * - Collinear Segment Simplification
 * - Wire Hit Testing & Junction Detection
 */

import type { WireSegment, Point2D, BoundingBox, Wire, RoutingMode } from '@apptypes/core';

export type RouteStyle = RoutingMode;

export function snapToGrid(val: number, gridSize = 20): number {
  return Math.round(val / gridSize) * gridSize;
}

export function snapPointToGrid(p: Point2D, gridSize = 20): Point2D {
  return {
    x: snapToGrid(p.x, gridSize),
    y: snapToGrid(p.y, gridSize),
  };
}

const routeCache = new Map<string, WireSegment[]>();
const MAX_CACHE_SIZE = 10000;

export function clearWireRouteCache(): void {
  routeCache.clear();
}

/**
 * Route a wire between two points using a specified routing mode or waypoints.
 */
export function routeWire(
  from: Point2D,
  to: Point2D,
  style: RouteStyle = 'horizontal-first',
  gridSize = 20,
  waypoints: Point2D[] = [],
  obstacles: BoundingBox[] = [],
): WireSegment[] {
  // If custom waypoints are provided, build path through all waypoints
  if (waypoints && waypoints.length > 0) {
    return buildPathThroughWaypoints(from, to, waypoints, style, gridSize);
  }

  const fx = snapToGrid(from.x, gridSize);
  const fy = snapToGrid(from.y, gridSize);
  const tx = snapToGrid(to.x, gridSize);
  const ty = snapToGrid(to.y, gridSize);

  if (fx === tx && fy === ty) return [];

  // Check cache for simple routes without obstacles
  const isCacheable = (!obstacles || obstacles.length === 0);
  const cacheKey = isCacheable ? `${fx},${fy}->${tx},${ty}|${style}|${gridSize}` : null;
  if (cacheKey && routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // Straight single line
  if (fx === tx || fy === ty || style === 'direct') {
    return [{ from: { x: fx, y: fy }, to: { x: tx, y: ty } }];
  }

  // 45° Diagonal mode
  if (style === 'diagonal') {
    const dx = tx - fx;
    const dy = ty - fy;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const minD = Math.min(absDx, absDy);
    const diagEndX = fx + Math.sign(dx) * minD;
    const diagEndY = fy + Math.sign(dy) * minD;

    const segments: WireSegment[] = [
      { from: { x: fx, y: fy }, to: { x: diagEndX, y: diagEndY } },
    ];
    if (diagEndX !== tx || diagEndY !== ty) {
      segments.push({ from: { x: diagEndX, y: diagEndY }, to: { x: tx, y: ty } });
    }
    return simplifySegments(segments);
  }

  // Obstacle avoidance routing
  if (obstacles && obstacles.length > 0) {
    const obstaclePath = routeWithObstacleAvoidance({ x: fx, y: fy }, { x: tx, y: ty }, obstacles, gridSize);
    if (obstaclePath.length > 0) return obstaclePath;
  }

  let result: WireSegment[];
  switch (style) {
    case 'vertical-first':
      result = simplifySegments([
        { from: { x: fx, y: fy }, to: { x: fx, y: ty } },
        { from: { x: fx, y: ty }, to: { x: tx, y: ty } },
      ]);
      break;

    case 'z-shape': {
      const midX = snapToGrid((fx + tx) / 2, gridSize);
      result = simplifySegments([
        { from: { x: fx, y: fy }, to: { x: midX, y: fy } },
        { from: { x: midX, y: fy }, to: { x: midX, y: ty } },
        { from: { x: midX, y: ty }, to: { x: tx, y: ty } },
      ]);
      break;
    }

    case 'horizontal-first':
    case 'orthogonal':
    default:
      result = simplifySegments([
        { from: { x: fx, y: fy }, to: { x: tx, y: fy } },
        { from: { x: tx, y: fy }, to: { x: tx, y: ty } },
      ]);
      break;
  }

  if (cacheKey) {
    if (routeCache.size >= MAX_CACHE_SIZE) routeCache.clear();
    routeCache.set(cacheKey, result);
  }
  return result;
}

/**
 * Builds continuous orthogonal segments traversing through a chain of waypoints.
 */
export function buildPathThroughWaypoints(
  from: Point2D,
  to: Point2D,
  waypoints: Point2D[],
  style: RouteStyle = 'orthogonal',
  gridSize = 20,
): WireSegment[] {
  const pts: Point2D[] = [from, ...waypoints, to].map(p => snapPointToGrid(p, gridSize));
  const segments: WireSegment[] = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (p1.x === p2.x && p1.y === p2.y) continue;

    if (p1.x === p2.x || p1.y === p2.y || style === 'direct') {
      segments.push({ from: p1, to: p2 });
    } else if (style === 'diagonal') {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const minD = Math.min(Math.abs(dx), Math.abs(dy));
      const mid = { x: p1.x + Math.sign(dx) * minD, y: p1.y + Math.sign(dy) * minD };
      segments.push({ from: p1, to: mid });
      if (mid.x !== p2.x || mid.y !== p2.y) {
        segments.push({ from: mid, to: p2 });
      }
    } else {
      // Orthogonal L-step between waypoints
      const corner = { x: p2.x, y: p1.y };
      segments.push({ from: p1, to: corner });
      segments.push({ from: corner, to: p2 });
    }
  }

  return simplifySegments(segments);
}

/**
 * Simplifies segments by merging collinear adjacent segments and removing zero-length segments.
 */
export function simplifySegments(segments: WireSegment[]): WireSegment[] {
  if (segments.length <= 1) return segments.filter(s => s.from.x !== s.to.x || s.from.y !== s.to.y);

  const clean: WireSegment[] = [];
  for (const s of segments) {
    if (s.from.x === s.to.x && s.from.y === s.to.y) continue;
    if (clean.length === 0) {
      clean.push({ ...s });
      continue;
    }

    const prev = clean[clean.length - 1];
    // Check if both are horizontal collinear
    if (prev.from.y === prev.to.y && prev.to.y === s.from.y && s.from.y === s.to.y) {
      clean[clean.length - 1] = { from: prev.from, to: s.to };
    }
    // Check if both are vertical collinear
    else if (prev.from.x === prev.to.x && prev.to.x === s.from.x && s.from.x === s.to.x) {
      clean[clean.length - 1] = { from: prev.from, to: s.to };
    } else {
      clean.push({ ...s });
    }
  }

  return clean;
}

/**
 * Obstacle-aware grid routing using Manhattan path search.
 */
function routeWithObstacleAvoidance(
  start: Point2D,
  end: Point2D,
  obstacles: BoundingBox[],
  gridSize: number,
): WireSegment[] {
  // Test if standard H-first hits an obstacle
  const hFirst = [
    { from: start, to: { x: end.x, y: start.y } },
    { from: { x: end.x, y: start.y }, to: end },
  ];
  if (!pathHitsObstacles(hFirst, obstacles)) {
    return simplifySegments(hFirst);
  }

  // Test if V-first is free
  const vFirst = [
    { from: start, to: { x: start.x, y: end.y } },
    { from: { x: start.x, y: end.y }, to: end },
  ];
  if (!pathHitsObstacles(vFirst, obstacles)) {
    return simplifySegments(vFirst);
  }

  // Test Z-shape with midpoint
  const midX = snapToGrid((start.x + end.x) / 2, gridSize);
  const zPath = [
    { from: start, to: { x: midX, y: start.y } },
    { from: { x: midX, y: start.y }, to: { x: midX, y: end.y } },
    { from: { x: midX, y: end.y }, to: end },
  ];
  if (!pathHitsObstacles(zPath, obstacles)) {
    return simplifySegments(zPath);
  }

  // Fallback to cleanest H-first if congested
  return simplifySegments(hFirst);
}

function pathHitsObstacles(segments: WireSegment[], obstacles: BoundingBox[]): boolean {
  for (const seg of segments) {
    for (const obs of obstacles) {
      // Pad obstacle slightly
      const box = {
        x: obs.x - 2,
        y: obs.y - 2,
        width: obs.width + 4,
        height: obs.height + 4,
      };
      if (segmentIntersectsBox(seg, box)) return true;
    }
  }
  return false;
}

function segmentIntersectsBox(seg: WireSegment, box: BoundingBox): boolean {
  const minX = Math.min(seg.from.x, seg.to.x);
  const maxX = Math.max(seg.from.x, seg.to.x);
  const minY = Math.min(seg.from.y, seg.to.y);
  const maxY = Math.max(seg.from.y, seg.to.y);

  if (seg.from.y === seg.to.y) {
    // Horizontal segment
    const y = seg.from.y;
    return y >= box.y && y <= box.y + box.height && maxX >= box.x && minX <= box.x + box.width;
  }
  if (seg.from.x === seg.to.x) {
    // Vertical segment
    const x = seg.from.x;
    return x >= box.x && x <= box.x + box.width && maxY >= box.y && minY <= box.y + box.height;
  }

  return false;
}

/**
 * Calculates the shortest distance from a point to a segment.
 */
export function getDistanceToSegment(p: Point2D, seg: WireSegment): number {
  const x1 = seg.from.x;
  const y1 = seg.from.y;
  const x2 = seg.to.x;
  const y2 = seg.to.y;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(p.x - x1, p.y - y1);
  }

  let t = ((p.x - x1) * dx + (p.y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Detects if a point is close to any segment in a wire.
 */
export function isPointNearWire(p: Point2D, wire: Wire, hitRadius = 8): boolean {
  for (const seg of wire.segments) {
    if (getDistanceToSegment(p, seg) <= hitRadius) {
      return true;
    }
  }
  return false;
}

/**
 * Detects if two orthogonal segments intersect.
 */
export function segmentsIntersect(a: WireSegment, b: WireSegment): Point2D | null {
  const isHorizontal = (s: WireSegment) => s.from.y === s.to.y;
  const isVertical = (s: WireSegment) => s.from.x === s.to.x;

  if (isHorizontal(a) && isVertical(b)) return checkHVIntersection(a, b);
  if (isVertical(a) && isHorizontal(b)) return checkHVIntersection(b, a);
  return null;
}

function checkHVIntersection(h: WireSegment, v: WireSegment): Point2D | null {
  const hMinX = Math.min(h.from.x, h.to.x);
  const hMaxX = Math.max(h.from.x, h.to.x);
  const vMinY = Math.min(v.from.y, v.to.y);
  const vMaxY = Math.max(v.from.y, v.to.y);
  const hY = h.from.y;
  const vX = v.from.x;

  if (vX > hMinX && vX < hMaxX && hY > vMinY && hY < vMaxY) {
    return { x: vX, y: hY };
  }
  return null;
}
