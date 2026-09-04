/**
 * FSM Edge Router — Computes collision-free curved edges,
 * self-loops, and separates parallel & bidirectional transitions.
 */
import type { Point2D } from '@apptypes/core';

export interface CurvedEdgePath {
  pathD: string;
  labelPos: Point2D;
  controlPoint: Point2D;
  startPoint: Point2D;
  endPoint: Point2D;
  arrowAngle: number;
}

export interface SelfLoopPath {
  pathD: string;
  labelPos: Point2D;
  controlPoint: Point2D;
}

/**
 * Computes a self-loop path escaping smoothly from a state node.
 * Uses a cubic Bezier curve above the node.
 */
export function computeSelfLoopPath(
  center: Point2D,
  radius: number,
  loopIndex = 0,
): SelfLoopPath {
  const heightOffset = 35 + loopIndex * 25;
  const spread = 20 + loopIndex * 6;

  const startX = center.x - spread;
  const startY = center.y - radius;
  const endX = center.x + spread;
  const endY = center.y - radius;

  const cp1X = center.x - spread - 20;
  const cp1Y = center.y - radius - heightOffset;
  const cp2X = center.x + spread + 20;
  const cp2Y = center.y - radius - heightOffset;

  const pathD = `M ${startX},${startY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;
  const labelPos: Point2D = {
    x: center.x,
    y: center.y - radius - heightOffset + 8,
  };
  const controlPoint: Point2D = {
    x: center.x,
    y: center.y - radius - heightOffset,
  };

  return { pathD, labelPos, controlPoint };
}

/**
 * Computes a quadratic Bezier curve between two distinct state nodes.
 * Automatically handles curvature for parallel and bidirectional transitions.
 */
export function computeCurvedEdge(
  from: Point2D,
  to: Point2D,
  nodeRadius: number,
  curvatureOffset = 0, // In pixels normal to center line
): CurvedEdgePath {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) {
    return {
      pathD: `M ${from.x},${from.y}`,
      labelPos: { x: from.x, y: from.y },
      controlPoint: { x: from.x, y: from.y },
      startPoint: { x: from.x, y: from.y },
      endPoint: { x: to.x, y: to.y },
      arrowAngle: 0,
    };
  }

  const ux = dx / dist;
  const uy = dy / dist;

  // Normal unit vector (perpendicular to line from -> to)
  const nx = -uy;
  const ny = ux;

  // Midpoint with offset along normal
  const midX = (from.x + to.x) / 2 + nx * curvatureOffset;
  const midY = (from.y + to.y) / 2 + ny * curvatureOffset;
  const controlPoint: Point2D = { x: midX, y: midY };

  // Calculate accurate contact points on node perimeters using direction to control point
  const fromToCpDist = Math.hypot(midX - from.x, midY - from.y) || 1;
  const startX = from.x + ((midX - from.x) / fromToCpDist) * nodeRadius;
  const startY = from.y + ((midY - from.y) / fromToCpDist) * nodeRadius;

  const toToCpDist = Math.hypot(midX - to.x, midY - to.y) || 1;
  const endX = to.x + ((midX - to.x) / toToCpDist) * nodeRadius;
  const endY = to.y + ((midY - to.y) / toToCpDist) * nodeRadius;

  // Quadratic Bezier formula point at t=0.5 for label
  const labelX = 0.25 * startX + 0.5 * midX + 0.25 * endX;
  const labelY = 0.25 * startY + 0.5 * midY + 0.25 * endY;

  // Tangent at end point for arrow orientation
  const arrowDx = endX - midX;
  const arrowDy = endY - midY;
  const arrowAngle = Math.atan2(arrowDy, arrowDx);

  const pathD = `M ${startX},${startY} Q ${midX},${midY} ${endX},${endY}`;

  return {
    pathD,
    labelPos: { x: labelX + nx * 8, y: labelY + ny * 8 },
    controlPoint,
    startPoint: { x: startX, y: startY },
    endPoint: { x: endX, y: endY },
    arrowAngle,
  };
}
