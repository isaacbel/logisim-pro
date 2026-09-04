/**
 * Prime Implicant, Essential Group Extraction & Petrick's Method for Karnaugh Maps (2 to 6 variables)
 */

import { KMapStructure } from './kmap';
import { KMapGroupVisual, findAllValidGroups } from './grouping';

export interface PrimeImplicantChartRow {
  group: KMapGroupVisual;
  isEssential: boolean;
  covers: Record<number, boolean>;
}

export interface KMapSolution {
  allPrimeImplicants: KMapGroupVisual[];
  selectedGroups: KMapGroupVisual[];
  essentialGroups: KMapGroupVisual[];
  simplifiedExpression: string;
  chart: {
    targetMinterms: number[];
    rows: PrimeImplicantChartRow[];
  };
  allMinimalSolutions: {
    groups: KMapGroupVisual[];
    expression: string;
    termCount: number;
    literalCount: number;
  }[];
}

export function solveOptimalKMapGroups(
  structure: KMapStructure,
  mode: 'sop' | 'pos' = 'sop'
): KMapSolution {
  const allGroups = findAllValidGroups(structure, mode);

  // Extract all target cells (1s for SOP, 0s for POS, excluding 'X') across all planes
  const targetVal = mode === 'sop' ? 1 : 0;
  const targetMinterms: number[] = [];
  structure.planes.forEach(plane => {
    plane.grid.forEach(row => {
      row.forEach(cell => {
        if (cell.value === targetVal && !targetMinterms.includes(cell.minterm)) {
          targetMinterms.push(cell.minterm);
        }
      });
    });
  });
  targetMinterms.sort((a, b) => a - b);

  const emptyExpr = mode === 'sop' ? '0' : '1';

  if (targetMinterms.length === 0) {
    return {
      allPrimeImplicants: [],
      selectedGroups: [],
      essentialGroups: [],
      simplifiedExpression: emptyExpr,
      chart: { targetMinterms: [], rows: [] },
      allMinimalSolutions: [{ groups: [], expression: emptyExpr, termCount: 0, literalCount: 0 }],
    };
  }

  // Filter prime implicants: a group is prime if it is not a strict subset of any larger group
  const primeGroups: KMapGroupVisual[] = [];
  for (let i = 0; i < allGroups.length; i++) {
    const g1 = allGroups[i];

    let isSubsumed = false;
    for (let j = 0; j < allGroups.length; j++) {
      if (i === j) continue;
      const g2 = allGroups[j];
      if (g2.minterms.length > g1.minterms.length) {
        const g2Set = new Set(g2.minterms);
        if (g1.minterms.every(m => g2Set.has(m))) {
          isSubsumed = true;
          break;
        }
      }
    }

    if (!isSubsumed) {
      primeGroups.push(g1);
    }
  }

  // Determine Essential Prime Implicants
  const essentialGroups: KMapGroupVisual[] = [];
  const coveredByEssential = new Set<number>();

  for (const m of targetMinterms) {
    const covering = primeGroups.filter(g => g.minterms.includes(m));
    if (covering.length === 1) {
      covering[0].isEssential = true;
      if (!essentialGroups.some(eg => eg.id === covering[0].id)) {
        essentialGroups.push(covering[0]);
        covering[0].minterms.forEach(min => coveredByEssential.add(min));
      }
    }
  }

  // Build Chart Matrix
  const chartRows: PrimeImplicantChartRow[] = primeGroups.map(g => {
    const covers: Record<number, boolean> = {};
    targetMinterms.forEach(m => {
      covers[m] = g.minterms.includes(m);
    });
    return {
      group: g,
      isEssential: g.isEssential,
      covers,
    };
  });

  // Find all minimal solutions using branch-and-bound / Petrick's covering
  const remainingMinterms = targetMinterms.filter(m => !coveredByEssential.has(m));
  const remainingGroups = primeGroups.filter(g => !g.isEssential);

  const minimalCovers = solvePetricksCovers(essentialGroups, remainingGroups, remainingMinterms);

  const allMinimalSolutions = minimalCovers.map(groups => {
    const expr = formatGroupsExpression(groups, mode);
    let lits = 0;
    groups.forEach(g => {
      lits += (g.term.match(/[A-Z]/g) ?? []).length;
    });
    return {
      groups,
      expression: expr,
      termCount: groups.length,
      literalCount: lits,
    };
  });

  const bestSolution = allMinimalSolutions[0] ?? {
    groups: essentialGroups,
    expression: formatGroupsExpression(essentialGroups, mode) || emptyExpr,
    termCount: essentialGroups.length,
    literalCount: 0,
  };

  return {
    allPrimeImplicants: primeGroups,
    selectedGroups: bestSolution.groups,
    essentialGroups,
    simplifiedExpression: bestSolution.expression || emptyExpr,
    chart: {
      targetMinterms,
      rows: chartRows,
    },
    allMinimalSolutions,
  };
}

function solvePetricksCovers(
  essential: KMapGroupVisual[],
  remaining: KMapGroupVisual[],
  uncoveredMinterms: number[]
): KMapGroupVisual[][] {
  if (uncoveredMinterms.length === 0) {
    return [essential];
  }

  const validCovers: KMapGroupVisual[][] = [];
  let minCoverSize = Infinity;

  function search(idx: number, currentSelected: KMapGroupVisual[], uncovered: Set<number>) {
    if (uncovered.size === 0) {
      const fullCover = [...essential, ...currentSelected];
      if (fullCover.length < minCoverSize) {
        minCoverSize = fullCover.length;
        validCovers.length = 0;
        validCovers.push(fullCover);
      } else if (fullCover.length === minCoverSize) {
        validCovers.push(fullCover);
      }
      return;
    }

    if (idx >= remaining.length || currentSelected.length + essential.length >= minCoverSize) {
      return;
    }

    const g = remaining[idx];

    // Branch 1: Include this group if it covers at least one uncovered minterm
    const coversAny = g.minterms.some(m => uncovered.has(m));
    if (coversAny) {
      const nextUncovered = new Set(uncovered);
      g.minterms.forEach(m => nextUncovered.delete(m));
      search(idx + 1, [...currentSelected, g], nextUncovered);
    }

    // Branch 2: Skip this group
    search(idx + 1, currentSelected, uncovered);
  }

  search(0, [], new Set(uncoveredMinterms));

  if (validCovers.length === 0) {
    return [[...essential, ...remaining]];
  }

  // Deduplicate covers
  const seen = new Set<string>();
  const uniqueCovers: KMapGroupVisual[][] = [];
  for (const cover of validCovers) {
    const key = cover.map(g => g.id).sort().join(',');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCovers.push(cover);
    }
  }

  return uniqueCovers;
}

function formatGroupsExpression(groups: KMapGroupVisual[], mode: 'sop' | 'pos'): string {
  if (groups.length === 0) return mode === 'sop' ? '0' : '1';
  if (groups.some(g => g.term === '1' && mode === 'sop')) return '1';
  if (groups.some(g => g.term === '0' && mode === 'pos')) return '0';

  const terms = groups.map(g => g.term);
  return mode === 'sop' ? terms.join(' + ') : terms.join(' · ');
}
