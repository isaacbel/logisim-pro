/**
 * Generalized Toroidal Karnaugh Map Grouping Engine (2 to 6 variables)
 * Detects power-of-2 hypercube rectangular groups with multi-plane spanning,
 * edge wrapping, 4-corner groups, and educational explanations.
 */

import { KMapStructure } from './kmap';

export interface GroupCellRef {
  plane: number;
  row: number;
  col: number;
  minterm: number;
}

export interface KMapGroupVisual {
  id: string;
  minterms: number[];
  cells: GroupCellRef[];
  term: string;
  color: string;
  isEssential: boolean;
  size: number;
  wrapsHorizontal: boolean;
  wrapsVertical: boolean;
  wrapsCorners: boolean;
  spansPlanes: boolean;
  planeIndices: number[];
  invariantVariables: { name: string; value: 0 | 1 }[];
  changingVariables: string[];
  explanation: string;
}

export const KMAP_PALETTE = [
  '#89b4fa', // Blue
  '#a6e3a1', // Green
  '#f38ba8', // Red
  '#f9e2af', // Yellow
  '#cba6f7', // Mauve
  '#94e2d5', // Teal
  '#fab387', // Peach
  '#b4befe', // Lavender
  '#f5c2e7', // Pink
  '#74c7ec', // Sapphire
  '#a6adc8', // Subtext
  '#f2cdcd', // Flamingo
];

/**
 * Finds all valid power-of-2 groups across all planes in the K-Map
 */
export function findAllValidGroups(
  structure: KMapStructure,
  mode: 'sop' | 'pos' = 'sop'
): KMapGroupVisual[] {
  const { numPlanes, numRows, numCols, planes, variables } = structure;
  const validGroups: KMapGroupVisual[] = [];
  const seenMintermKeys = new Set<string>();

  const invalidVal = mode === 'sop' ? 0 : 1;
  const targetVal = mode === 'sop' ? 1 : 0;

  // Possible power-of-2 dimensions for [depth(planes), height(rows), width(cols)]
  const pSizes = [4, 2, 1].filter(p => p <= numPlanes);
  const rSizes = [4, 2, 1].filter(r => r <= numRows);
  const cSizes = [4, 2, 1].filter(c => c <= numCols);

  const dimensionTriplets: [number, number, number][] = [];
  for (const dp of pSizes) {
    for (const dr of rSizes) {
      for (const dc of cSizes) {
        dimensionTriplets.push([dp, dr, dc]);
      }
    }
  }

  // Sort by total volume descending (64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1)
  dimensionTriplets.sort((a, b) => (b[0] * b[1] * b[2]) - (a[0] * a[1] * a[2]));

  let groupIdCounter = 1;

  for (const [dp, dr, dc] of dimensionTriplets) {
    for (let p0 = 0; p0 < numPlanes; p0++) {
      for (let r0 = 0; r0 < numRows; r0++) {
        for (let c0 = 0; c0 < numCols; c0++) {
          const cells: GroupCellRef[] = [];
          let allValid = true;
          let hasAtLeastOneTarget = false;

          for (let dpIdx = 0; dpIdx < dp; dpIdx++) {
            const p = (p0 + dpIdx) % numPlanes;
            const planeGrid = planes[p].grid;

            for (let drIdx = 0; drIdx < dr; drIdx++) {
              const r = (r0 + drIdx) % numRows;

              for (let dcIdx = 0; dcIdx < dc; dcIdx++) {
                const c = (c0 + dcIdx) % numCols;
                const cell = planeGrid[r][c];

                if (cell.value === invalidVal) {
                  allValid = false;
                  break;
                }
                if (cell.value === targetVal) {
                  hasAtLeastOneTarget = true;
                }
                cells.push({ plane: p, row: r, col: c, minterm: cell.minterm });
              }
              if (!allValid) break;
            }
            if (!allValid) break;
          }

          if (allValid && hasAtLeastOneTarget) {
            const minterms = Array.from(new Set(cells.map(c => c.minterm))).sort((a, b) => a - b);
            const key = minterms.join(',');

            if (!seenMintermKeys.has(key)) {
              seenMintermKeys.add(key);

              // Detect wrapping & multi-plane properties
              const rowsUsed = new Set(cells.map(c => c.row));
              const colsUsed = new Set(cells.map(c => c.col));
              const planesUsed = Array.from(new Set(cells.map(c => c.plane))).sort((a, b) => a - b);

              const wrapsH = dc < numCols && colsUsed.has(0) && colsUsed.has(numCols - 1);
              const wrapsV = dr < numRows && rowsUsed.has(0) && rowsUsed.has(numRows - 1);
              const wrapsCorners = numRows === 4 && numCols === 4 && dr === 2 && dc === 2 && wrapsH && wrapsV;
              const spansPlanes = planesUsed.length > 1;

              const analysis = analyzeGroupVariables(minterms, variables, mode);
              const color = KMAP_PALETTE[(groupIdCounter - 1) % KMAP_PALETTE.length];

              validGroups.push({
                id: `kgroup-${groupIdCounter++}`,
                minterms,
                cells,
                term: analysis.term,
                color,
                isEssential: false,
                size: minterms.length,
                wrapsHorizontal: wrapsH,
                wrapsVertical: wrapsV,
                wrapsCorners,
                spansPlanes,
                planeIndices: planesUsed,
                invariantVariables: analysis.invariantVariables,
                changingVariables: analysis.changingVariables,
                explanation: analysis.explanation,
              });
            }
          }
        }
      }
    }
  }

  return validGroups;
}

/**
 * Educational analysis of invariant vs changing variables for a group of minterms
 */
export function analyzeGroupVariables(
  minterms: number[],
  variables: string[],
  mode: 'sop' | 'pos' = 'sop'
): {
  term: string;
  invariantVariables: { name: string; value: 0 | 1 }[];
  changingVariables: string[];
  explanation: string;
} {
  const n = variables.length;
  if (minterms.length === 0) {
    return {
      term: mode === 'sop' ? '0' : '1',
      invariantVariables: [],
      changingVariables: [...variables],
      explanation: 'Empty group.',
    };
  }

  if (minterms.length === (1 << n)) {
    return {
      term: mode === 'sop' ? '1' : '0',
      invariantVariables: [],
      changingVariables: [...variables],
      explanation: `All ${1 << n} cells grouped: all variables change, resulting in constant ${mode === 'sop' ? '1' : '0'}.`,
    };
  }

  const invariant: { name: string; value: 0 | 1 }[] = [];
  const changing: string[] = [];

  for (let bit = 0; bit < n; bit++) {
    const shift = n - 1 - bit;
    const firstBit = (minterms[0] >> shift) & 1;
    const isConstant = minterms.every(m => ((m >> shift) & 1) === firstBit);

    if (isConstant) {
      invariant.push({ name: variables[bit], value: firstBit as 0 | 1 });
    } else {
      changing.push(variables[bit]);
    }
  }

  let term = '';
  if (mode === 'sop') {
    term = invariant.map(v => (v.value === 1 ? v.name : `${v.name}'`)).join('');
    if (!term) term = '1';
  } else {
    // POS: 0 -> variable, 1 -> variable'
    const sums = invariant.map(v => (v.value === 0 ? v.name : `${v.name}'`));
    term = sums.length > 0 ? `(${sums.join(' + ')})` : '0';
  }

  const cellList = minterms.map(m => `m${m}`).join(', ');
  const changingStr = changing.length > 0 ? changing.join(', ') : 'None';
  const invariantStr = invariant.map(v => `${v.name}=${v.value}`).join(', ');
  const explanation = `Cells: [${cellList}]. Changing variables (${changingStr}) eliminate. Invariant variables (${invariantStr}) yield term "${term}".`;

  return {
    term,
    invariantVariables: invariant,
    changingVariables: changing,
    explanation,
  };
}

export function deriveTermFromMinterms(
  minterms: number[],
  variables: string[],
  mode: 'sop' | 'pos' = 'sop'
): string {
  return analyzeGroupVariables(minterms, variables, mode).term;
}
