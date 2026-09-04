/**
 * Utility functions for the Digital Logic Simulator
 */

import type { Point2D } from '@apptypes/core';

/**
 * Calculate the world coordinates of a pin considering component position and rotation.
 * Rotation is 0, 90, 180, or 270 degrees around the center of the component bounds.
 */
export function getPinWorldPosition(
  component: { transform: { x: number; y: number; rotation?: number }; bounds: { width: number; height: number } },
  pin: { position: { x: number; y: number } }
): Point2D {
  const { x, y, rotation = 0 } = component.transform;
  const cx = component.bounds.width / 2;
  const cy = component.bounds.height / 2;
  const dx = pin.position.x - cx;
  const dy = pin.position.y - cy;

  const rot = ((rotation % 360) + 360) % 360;
  let rdx = dx;
  let rdy = dy;

  if (rot === 90) {
    rdx = -dy;
    rdy = dx;
  } else if (rot === 180) {
    rdx = -dx;
    rdy = -dy;
  } else if (rot === 270) {
    rdx = dy;
    rdy = -dx;
  }

  return {
    x: Math.round(x + cx + rdx),
    y: Math.round(y + cy + rdy),
  };
}

/**
 * Calculate effective world bounding box of a component considering rotation.
 */
export function getComponentWorldBounds(
  component: { transform: { x: number; y: number; rotation?: number }; bounds: { width: number; height: number } }
): { x: number; y: number; width: number; height: number } {
  const { x, y, rotation = 0 } = component.transform;
  const rot = ((rotation % 360) + 360) % 360;
  if (rot === 90 || rot === 270) {
    const cx = component.bounds.width / 2;
    const cy = component.bounds.height / 2;
    const newW = component.bounds.height;
    const newH = component.bounds.width;
    return {
      x: x + cx - newW / 2,
      y: y + cy - newH / 2,
      width: newW,
      height: newH,
    };
  }
  return {
    x,
    y,
    width: component.bounds.width,
    height: component.bounds.height,
  };
}

