/**
 * Generalized Karnaugh Map Data Structures (2 to 6 variables)
 * Supports single plane (2, 3, 4 vars) and multi-plane hypercubes (5, 6 vars).
 */

import { GRAY_CODE_1, GRAY_CODE_2 } from './grayCode';

export type CellValue = 0 | 1 | 'X';

export interface KMapCell {
  plane: number;
  row: number;
  col: number;
  minterm: number;
  binary: string;
  value: CellValue;
}

export interface KMapPlane {
  planeIndex: number;
  planeHeader: string; // e.g. "E=0", "EF=01"
  grid: KMapCell[][];
  numRows: number;
  numCols: number;
}

export interface KMapStructure {
  variables: string[];
  numVars: 2 | 3 | 4 | 5 | 6;
  numPlanes: number;
  numRows: number;
  numCols: number;
  planeVarNames: string[];
  rowVarNames: string[];
  colVarNames: string[];
  planeHeaders: string[];
  rowHeaders: string[];
  colHeaders: string[];
  // For backward compatibility with 2/3/4 vars (plane 0)
  grid: KMapCell[][];
  // Full multi-plane representation for 2..6 vars
  planes: KMapPlane[];
}

/**
 * Creates a dimension-independent K-Map structure for 2, 3, 4, 5, or 6 variables
 */
export function createKMapStructure(
  variables: string[],
  minterms: number[] = [],
  dontCares: number[] = []
): KMapStructure {
  const numVars = Math.max(2, Math.min(6, variables.length)) as 2 | 3 | 4 | 5 | 6;
  const safeVars = variables.slice(0, numVars);
  while (safeVars.length < numVars) {
    safeVars.push(String.fromCharCode(65 + safeVars.length));
  }

  const mintermSet = new Set(minterms);
  const dontCareSet = new Set(dontCares);

  let planeVarNames: string[] = [];
  let rowVarNames: string[] = [];
  let colVarNames: string[] = [];
  let planeHeaders: string[] = [''];
  let rowHeaders: string[] = [];
  let colHeaders: string[] = [];

  let numPlanes = 1;
  let numRows = 2;
  let numCols = 2;

  if (numVars === 2) {
    // 2 vars: A (row), B (col)
    rowVarNames = [safeVars[0]];
    colVarNames = [safeVars[1]];
    rowHeaders = GRAY_CODE_1;
    colHeaders = GRAY_CODE_1;
    numRows = 2;
    numCols = 2;
    numPlanes = 1;
  } else if (numVars === 3) {
    // 3 vars: A (row), BC (cols)
    rowVarNames = [safeVars[0]];
    colVarNames = [safeVars[1], safeVars[2]];
    rowHeaders = GRAY_CODE_1;
    colHeaders = GRAY_CODE_2;
    numRows = 2;
    numCols = 4;
    numPlanes = 1;
  } else if (numVars === 4) {
    // 4 vars: AB (rows), CD (cols)
    rowVarNames = [safeVars[0], safeVars[1]];
    colVarNames = [safeVars[2], safeVars[3]];
    rowHeaders = GRAY_CODE_2;
    colHeaders = GRAY_CODE_2;
    numRows = 4;
    numCols = 4;
    numPlanes = 1;
  } else if (numVars === 5) {
    // 5 vars: AB (rows), CD (cols), E (planes: E=0, E=1)
    planeVarNames = [safeVars[4]];
    rowVarNames = [safeVars[0], safeVars[1]];
    colVarNames = [safeVars[2], safeVars[3]];
    planeHeaders = ['0', '1'];
    rowHeaders = GRAY_CODE_2;
    colHeaders = GRAY_CODE_2;
    numPlanes = 2;
    numRows = 4;
    numCols = 4;
  } else {
    // 6 vars: AB (rows), CD (cols), EF (planes: 00, 01, 11, 10)
    planeVarNames = [safeVars[4], safeVars[5]];
    rowVarNames = [safeVars[0], safeVars[1]];
    colVarNames = [safeVars[2], safeVars[3]];
    planeHeaders = GRAY_CODE_2;
    rowHeaders = GRAY_CODE_2;
    colHeaders = GRAY_CODE_2;
    numPlanes = 4;
    numRows = 4;
    numCols = 4;
  }

  const planes: KMapPlane[] = [];

  for (let p = 0; p < numPlanes; p++) {
    const pBin = numPlanes > 1 ? planeHeaders[p] : '';
    const planeGrid: KMapCell[][] = [];

    for (let r = 0; r < numRows; r++) {
      const rowCells: KMapCell[] = [];
      const rBin = rowHeaders[r];

      for (let c = 0; c < numCols; c++) {
        const cBin = colHeaders[c];
        // Full binary string ordered as safeVars [A, B, C, D, E, F]
        // Row = A(B), Col = C(D), Plane = E(F)
        const fullBin = rBin + cBin + pBin;
        const minterm = parseInt(fullBin, 2);

        const value: CellValue = mintermSet.has(minterm)
          ? 1
          : dontCareSet.has(minterm)
          ? 'X'
          : 0;

        rowCells.push({
          plane: p,
          row: r,
          col: c,
          minterm,
          binary: fullBin,
          value,
        });
      }
      planeGrid.push(rowCells);
    }

    let planeHeaderLabel = '';
    if (numVars === 5) {
      planeHeaderLabel = `${planeVarNames[0]} = ${planeHeaders[p]}`;
    } else if (numVars === 6) {
      planeHeaderLabel = `${planeVarNames[0]}${planeVarNames[1]} = ${planeHeaders[p]}`;
    }

    planes.push({
      planeIndex: p,
      planeHeader: planeHeaderLabel,
      grid: planeGrid,
      numRows,
      numCols,
    });
  }

  return {
    variables: safeVars,
    numVars,
    numPlanes,
    numRows,
    numCols,
    planeVarNames,
    rowVarNames,
    colVarNames,
    planeHeaders,
    rowHeaders,
    colHeaders,
    grid: planes[0].grid, // Backward compatible 2D grid for plane 0
    planes,
  };
}

/**
 * Maps a minterm index to its (plane, row, col) in the K-Map
 */
export function mintermToKMapCoordinates(
  minterm: number,
  numVars: 2 | 3 | 4 | 5 | 6
): { plane: number; row: number; col: number } {
  const bin = minterm.toString(2).padStart(numVars, '0');

  if (numVars === 2) {
    const r = bin[0] === '1' ? 1 : 0;
    const c = bin[1] === '1' ? 1 : 0;
    return { plane: 0, row: r, col: c };
  }

  if (numVars === 3) {
    const r = bin[0] === '1' ? 1 : 0;
    const colBin = bin.slice(1);
    const c = GRAY_CODE_2.indexOf(colBin);
    return { plane: 0, row: r, col: c >= 0 ? c : 0 };
  }

  if (numVars === 4) {
    const rowBin = bin.slice(0, 2);
    const colBin = bin.slice(2);
    const r = GRAY_CODE_2.indexOf(rowBin);
    const c = GRAY_CODE_2.indexOf(colBin);
    return { plane: 0, row: r >= 0 ? r : 0, col: c >= 0 ? c : 0 };
  }

  if (numVars === 5) {
    const rowBin = bin.slice(0, 2);
    const colBin = bin.slice(2, 4);
    const planeBin = bin.slice(4);
    const r = GRAY_CODE_2.indexOf(rowBin);
    const c = GRAY_CODE_2.indexOf(colBin);
    const p = planeBin === '1' ? 1 : 0;
    return { plane: p, row: r >= 0 ? r : 0, col: c >= 0 ? c : 0 };
  }

  // 6 variables: AB (rows), CD (cols), EF (planes)
  const rowBin = bin.slice(0, 2);
  const colBin = bin.slice(2, 4);
  const planeBin = bin.slice(4, 6);
  const r = GRAY_CODE_2.indexOf(rowBin);
  const c = GRAY_CODE_2.indexOf(colBin);
  const p = GRAY_CODE_2.indexOf(planeBin);
  return { plane: p >= 0 ? p : 0, row: r >= 0 ? r : 0, col: c >= 0 ? c : 0 };
}
