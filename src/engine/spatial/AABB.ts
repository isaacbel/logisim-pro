/**
 * Axis-Aligned Bounding Box utilities for the spatial index.
 */

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function aabbFromRect(x: number, y: number, width: number, height: number): AABB {
  return { x, y, w: width, h: height };
}

export function aabbIntersects(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

export function aabbContainsPoint(box: AABB, px: number, py: number): boolean {
  return px >= box.x && px <= box.x + box.w &&
         py >= box.y && py <= box.y + box.h;
}

export function aabbExpand(box: AABB, margin: number): AABB {
  return { x: box.x - margin, y: box.y - margin, w: box.w + margin * 2, h: box.h + margin * 2 };
}

export function aabbUnion(a: AABB, b: AABB): AABB {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: x2 - x, h: y2 - y };
}
