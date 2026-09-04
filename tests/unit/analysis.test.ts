import { describe, it, expect } from 'vitest';
import { generateTruthTable, exportTruthTableCSV } from '@engine/analysis/truthTable';
import { generateKMap } from '@engine/analysis/kmap';
import { analyzeBooleanFunction } from '@engine/analysis/booleanAlgebra';
import {
  routeWire,
  buildPathThroughWaypoints,
  simplifySegments,
  getDistanceToSegment,
  isPointNearWire,
} from '@engine/routing/wireRouter';
import { ComponentLogicRegistry, registerBuiltInLogics } from '@engine/simulation';
import { SignalValue } from '@apptypes/core';

describe('Truth Table Analysis', () => {
  it('should generate truth table for AND gate', () => {
    const registry = new ComponentLogicRegistry();
    registerBuiltInLogics(registry);

    const andGate = {
      id: 'and1', type: 'AND', category: 'gates' as const, name: 'AND',
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      pins: [
        { id: 'in1', name: 'A', direction: 'input' as const, bitWidth: 1, position: { x: 0, y: 0 }, shape: 'line' as const, currentValue: SignalValue.UNKNOWN, connectedWireIds: [] },
        { id: 'in2', name: 'B', direction: 'input' as const, bitWidth: 1, position: { x: 0, y: 10 }, shape: 'line' as const, currentValue: SignalValue.UNKNOWN, connectedWireIds: [] },
        { id: 'out1', name: 'Y', direction: 'output' as const, bitWidth: 1, position: { x: 50, y: 5 }, shape: 'line' as const, currentValue: SignalValue.UNKNOWN, connectedWireIds: [] },
      ],
      properties: {}, bounds: { x: 0, y: 0, width: 50, height: 50 },
    };

    const table = generateTruthTable(
      ['in1', 'in2'], ['out1'], ['A', 'B'], ['Y'],
      registry, [andGate], []
    );

    expect(table.rows.length).toBe(4);
    expect(table.rows[3].outputs['Y']).toBe(SignalValue.HIGH);
    expect(table.rows[0].outputs['Y']).toBe(SignalValue.LOW);

    const csv = exportTruthTableCSV(table);
    expect(csv).toContain('A,B,Y');
  });
});

describe('K-Map Solver', () => {
  it('should generate 2-variable K-Map', () => {
    const kmap = generateKMap(['A', 'B'], [3]);
    expect(kmap.variables).toEqual(['A', 'B']);
    expect(kmap.grid.length).toBe(2);
    expect(kmap.simplifiedExpression).toContain('AB');
  });

  it('should generate 3-variable K-Map with simplified SOP', () => {
    const kmap = generateKMap(['A', 'B', 'C'], [0, 1, 2, 3]);
    expect(kmap.simplifiedExpression).toBe("A'");
  });
});

describe('Boolean Algebra Solver', () => {
  it('should generate canonical SOP and POS forms', () => {
    const res = analyzeBooleanFunction(['A', 'B'], [SignalValue.LOW, SignalValue.LOW, SignalValue.LOW, SignalValue.HIGH]);
    expect(res.sop).toBe('AB');
    expect(res.canonicalMinterms).toEqual([3]);
    expect(res.canonicalMaxterms).toEqual([0, 1, 2]);
  });
});

describe('Authoritative Wire Router', () => {
  it('should route straight wires when aligned', () => {
    const segsH = routeWire({ x: 0, y: 40 }, { x: 100, y: 40 }, 'horizontal-first', 20);
    expect(segsH.length).toBe(1);
    expect(segsH[0]).toEqual({ from: { x: 0, y: 40 }, to: { x: 100, y: 40 } });

    const segsV = routeWire({ x: 60, y: 0 }, { x: 60, y: 120 }, 'vertical-first', 20);
    expect(segsV.length).toBe(1);
  });

  it('should route orthogonal L-shape (horizontal-first and vertical-first)', () => {
    const hFirst = routeWire({ x: 0, y: 0 }, { x: 100, y: 100 }, 'horizontal-first', 20);
    expect(hFirst.length).toBe(2);
    expect(hFirst[0]).toEqual({ from: { x: 0, y: 0 }, to: { x: 100, y: 0 } });
    expect(hFirst[1]).toEqual({ from: { x: 100, y: 0 }, to: { x: 100, y: 100 } });

    const vFirst = routeWire({ x: 0, y: 0 }, { x: 100, y: 100 }, 'vertical-first', 20);
    expect(vFirst.length).toBe(2);
    expect(vFirst[0]).toEqual({ from: { x: 0, y: 0 }, to: { x: 0, y: 100 } });
    expect(vFirst[1]).toEqual({ from: { x: 0, y: 100 }, to: { x: 100, y: 100 } });
  });

  it('should route Z-shape with midpoint', () => {
    const zSegs = routeWire({ x: 0, y: 0 }, { x: 100, y: 100 }, 'z-shape', 20);
    expect(zSegs.length).toBe(3);
    expect(zSegs[0].from).toEqual({ x: 0, y: 0 });
    expect(zSegs[0].to).toEqual({ x: 60, y: 0 });
    expect(zSegs[1].from).toEqual({ x: 60, y: 0 });
    expect(zSegs[1].to).toEqual({ x: 60, y: 100 });
    expect(zSegs[2].from).toEqual({ x: 60, y: 100 });
    expect(zSegs[2].to).toEqual({ x: 100, y: 100 });
  });

  it('should route 45° diagonal paths', () => {
    const diag = routeWire({ x: 0, y: 0 }, { x: 80, y: 60 }, 'diagonal', 20);
    expect(diag.length).toBeGreaterThanOrEqual(1);
    expect(diag[0].from).toEqual({ x: 0, y: 0 });
  });

  it('should route through multi-segment custom waypoints', () => {
    const waypoints = [{ x: 40, y: 80 }, { x: 120, y: 80 }];
    const path = buildPathThroughWaypoints({ x: 0, y: 0 }, { x: 200, y: 200 }, waypoints, 'orthogonal', 20);
    expect(path.length).toBeGreaterThanOrEqual(3);
    expect(path[0].from).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1].to).toEqual({ x: 200, y: 200 });
  });

  it('should simplify and merge collinear adjacent segments', () => {
    const unmerged = [
      { from: { x: 0, y: 0 }, to: { x: 50, y: 0 } },
      { from: { x: 50, y: 0 }, to: { x: 100, y: 0 } },
      { from: { x: 100, y: 0 }, to: { x: 100, y: 50 } },
    ];
    const merged = simplifySegments(unmerged);
    expect(merged.length).toBe(2);
    expect(merged[0]).toEqual({ from: { x: 0, y: 0 }, to: { x: 100, y: 0 } });
    expect(merged[1]).toEqual({ from: { x: 100, y: 0 }, to: { x: 100, y: 50 } });
  });

  it('should calculate distance and perform hit-testing on wires', () => {
    const seg = { from: { x: 0, y: 50 }, to: { x: 100, y: 50 } };
    expect(getDistanceToSegment({ x: 50, y: 55 }, seg)).toBe(5);
    expect(getDistanceToSegment({ x: 50, y: 50 }, seg)).toBe(0);

    const wire = {
      id: 'w1',
      segments: [seg],
      fromPinId: 'p1',
      toPinId: 'p2',
      bitWidth: 1,
      isBus: false,
      currentValue: SignalValue.HIGH,
      junctions: [],
    };
    expect(isPointNearWire({ x: 50, y: 54 }, wire, 8)).toBe(true);
    expect(isPointNearWire({ x: 50, y: 90 }, wire, 8)).toBe(false);
  });
});
