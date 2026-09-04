/**
 * Karnaugh Map (K-Map) Generator
 * Supports 2, 3, and 4 variable K-maps with SOP simplification.
 */

import type { KMapData, KMapGroup } from '@apptypes/core';

const GRAY_CODE_4 = ['00', '01', '11', '10'];

/**
 * Generate K-Map data for up to 4 variables.
 * minterms: array of minterm indices
 * dontCares: array of don't-care indices
 */
export function generateKMap(
  variables: string[],
  minterms: number[],
  dontCares: number[] = [],
): KMapData {
  const n = variables.length;
  if (n < 2 || n > 4) {
    throw new Error('K-Map supports 2–4 variables only');
  }

  const mintermSet = new Set(minterms);
  const dontCareSet = new Set(dontCares);

  // Build grid layout
  let rowHeaders: string[];
  let colHeaders: string[];
  let grid: (0 | 1 | 'X')[][];

  if (n === 2) {
    rowHeaders = ['0', '1'];
    colHeaders = ['0', '1'];
    grid = Array.from({ length: 2 }, (_, r) =>
      Array.from({ length: 2 }, (_, c) => {
        const idx = (r << 1) | c;
        return mintermSet.has(idx) ? 1 : dontCareSet.has(idx) ? 'X' : 0;
      })
    );
  } else if (n === 3) {
    rowHeaders = ['0', '1'];
    colHeaders = GRAY_CODE_4;
    grid = Array.from({ length: 2 }, (_, r) =>
      GRAY_CODE_4.map(gc => {
        const c0 = parseInt(gc[0], 2);
        const c1 = parseInt(gc[1], 2);
        const idx = (r << 2) | (c0 << 1) | c1;
        return mintermSet.has(idx) ? 1 : dontCareSet.has(idx) ? 'X' : 0;
      })
    );
  } else {
    // n === 4
    rowHeaders = GRAY_CODE_4;
    colHeaders = GRAY_CODE_4;
    grid = GRAY_CODE_4.map(rgc =>
      GRAY_CODE_4.map(cgc => {
        const r0 = parseInt(rgc[0], 2);
        const r1 = parseInt(rgc[1], 2);
        const c0 = parseInt(cgc[0], 2);
        const c1 = parseInt(cgc[1], 2);
        const idx = (r0 << 3) | (r1 << 2) | (c0 << 1) | c1;
        return mintermSet.has(idx) ? 1 : dontCareSet.has(idx) ? 'X' : 0;
      })
    );
  }

  // Simple greedy grouping (powers of 2)
  const groups: KMapGroup[] = findGroups(grid, minterms, n, variables, rowHeaders, colHeaders);
  const simplifiedExpression = buildSopExpression(groups);

  return {
    variables,
    grid,
    rowHeaders,
    colHeaders,
    groups,
    simplifiedExpression,
  };
}

const GROUP_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

function findGroups(
  _grid: (0 | 1 | 'X')[][],
  minterms: number[],
  n: number,
  variables: string[],
  _rowHeaders: string[],
  _colHeaders: string[],
): KMapGroup[] {
  const groups: KMapGroup[] = [];
  const covered = new Set<number>();

  // Try groups of size 8, 4, 2, 1
  for (const groupSize of [8, 4, 2, 1]) {
    if (groupSize > minterms.length) continue;
    for (let start = 0; start < minterms.length; start++) {
      const subset = minterms.slice(start, start + groupSize).filter(m => !covered.has(m));
      if (subset.length !== groupSize) continue;
      if (isPowerOfTwo(groupSize) && isValidGroup(subset, n)) {
        const term = buildGroupTerm(subset, variables);
        const cells = subset.map(m => mintermToCell(m, n));
        groups.push({ cells, color: GROUP_COLORS[groups.length % GROUP_COLORS.length], term });
        subset.forEach(m => covered.add(m));
      }
    }
  }

  // Cover any uncovered minterms as single cells
  for (const m of minterms) {
    if (!covered.has(m)) {
      const term = buildGroupTerm([m], variables);
      const cells = [mintermToCell(m, n)];
      groups.push({ cells, color: GROUP_COLORS[groups.length % GROUP_COLORS.length], term });
    }
  }

  return groups;
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function isValidGroup(minterms: number[], n: number): boolean {
  if (minterms.length === 1) return true;
  const diffBits = minterms.reduce((acc, m) => acc | (minterms[0] ^ m), 0);
  const diffCount = bitCount(diffBits);
  return diffCount === Math.log2(minterms.length) && minterms.length <= (1 << n);
}

function bitCount(n: number): number {
  let count = 0;
  while (n) { count += n & 1; n >>= 1; }
  return count;
}

function buildGroupTerm(minterms: number[], variables: string[]): string {
  if (minterms.length === 0) return '0';
  const n = variables.length;
  const terms: string[] = [];
  for (let i = 0; i < n; i++) {
    const bit = (minterms[0] >> (n - 1 - i)) & 1;
    const varies = minterms.some(m => ((m >> (n - 1 - i)) & 1) !== bit);
    if (!varies) {
      terms.push(bit === 1 ? variables[i] : `${variables[i]}'`);
    }
  }
  return terms.length > 0 ? terms.join('') : '1';
}

function mintermToCell(minterm: number, n: number): [number, number] {
  if (n === 2) return [minterm >> 1, minterm & 1];
  if (n === 3) return [minterm >> 2, minterm & 3];
  return [(minterm >> 2) & 3, minterm & 3];
}

function buildSopExpression(groups: KMapGroup[]): string {
  if (groups.length === 0) return '0';
  return groups.map(g => g.term).join(' + ');
}
