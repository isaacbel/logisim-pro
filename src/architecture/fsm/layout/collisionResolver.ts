/**
 * FSM Collision Resolver — Prevents node overlaps and preserves clean diagram spacing.
 */
import type { FsmState } from '../../engine/fsmTypes';

export function resolveCollisions(
  states: FsmState[],
  minDistance = 100,
  iterations = 20
): FsmState[] {
  const result = states.map(s => ({ ...s }));

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const s1 = result[i];
        const s2 = result[j];

        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const dist = Math.hypot(dx, dy);

        if (dist < minDistance) {
          const overlap = minDistance - dist;
          const nx = dist === 0 ? 1 : dx / dist;
          const ny = dist === 0 ? 0 : dy / dist;

          const shift = (overlap / 2) + 1;
          s1.x -= nx * shift;
          s1.y -= ny * shift;
          s2.x += nx * shift;
          s2.y += ny * shift;
          moved = true;
        }
      }
    }

    if (!moved) break;
  }

  return result;
}
