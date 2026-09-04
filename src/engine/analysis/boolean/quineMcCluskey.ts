/**
 * Complete Quine-McCluskey & Petrick's Method Minimizer
 * Supports minterms and Don't-Cares, detects essential prime implicants,
 * and extracts all minimal solutions of equal cost.
 */

export interface PrimeImplicant {
  binary: string; // e.g. "1-01"
  term: string;   // e.g. "AC'D"
  minterms: number[];
  isEssential: boolean;
}

export interface SimplificationCost {
  literals: number;
  terms: number;
  gates: number;
  depth: number;
}

export interface MinimalSolution {
  expression: string;
  terms: string[];
  cost: SimplificationCost;
}

export interface QuineMcCluskeyResult {
  variables: string[];
  primeImplicants: PrimeImplicant[];
  essentialPrimeImplicants: PrimeImplicant[];
  minimalSolutions: MinimalSolution[];
  bestExpression: string;
}

interface ImplicantItem {
  mask: string; // binary string with '-'
  minterms: Set<number>;
  used: boolean;
}

export function quineMcCluskey(
  minterms: number[],
  arg2: number[] | string[] = [],
  arg3?: string[]
): QuineMcCluskeyResult {
  let dontCares: number[] = [];
  let variables: string[] = [];

  if (Array.isArray(arg2) && typeof arg2[0] === 'string') {
    variables = arg2 as string[];
    dontCares = [];
  } else {
    dontCares = (arg2 as number[]) || [];
    variables = arg3 || ['A', 'B'];
  }

  const n = variables.length;
  const total = 1 << n;

  // Edge cases
  if (minterms.length === 0) {
    return {
      variables,
      primeImplicants: [],
      essentialPrimeImplicants: [],
      minimalSolutions: [{ expression: '0', terms: [], cost: { literals: 0, terms: 0, gates: 0, depth: 0 } }],
      bestExpression: '0',
    };
  }

  if (minterms.length + dontCares.length >= total) {
    return {
      variables,
      primeImplicants: [{ binary: '-'.repeat(n), term: '1', minterms: Array.from({ length: total }, (_, i) => i), isEssential: true }],
      essentialPrimeImplicants: [{ binary: '-'.repeat(n), term: '1', minterms: Array.from({ length: total }, (_, i) => i), isEssential: true }],
      minimalSolutions: [{ expression: '1', terms: ['1'], cost: { literals: 0, terms: 1, gates: 0, depth: 0 } }],
      bestExpression: '1',
    };
  }

  const allTerms = Array.from(new Set([...minterms, ...dontCares])).sort((a, b) => a - b);

  // Group terms by number of 1s
  let groups: Map<number, ImplicantItem[]> = new Map();
  for (const m of allTerms) {
    const bin = m.toString(2).padStart(n, '0');
    const ones = countOnes(bin);
    if (!groups.has(ones)) groups.set(ones, []);
    groups.get(ones)!.push({ mask: bin, minterms: new Set([m]), used: false });
  }

  const primeImplicantsList: ImplicantItem[] = [];

  // Successive merging of adjacent groups
  while (groups.size > 0) {
    const nextGroups: Map<number, ImplicantItem[]> = new Map();
    const seenMasks = new Set<string>();

    const onesKeys = Array.from(groups.keys()).sort((a, b) => a - b);

    for (let k = 0; k < onesKeys.length - 1; k++) {
      const g1 = onesKeys[k];
      const g2 = onesKeys[k + 1];
      if (g2 !== g1 + 1) continue;

      const list1 = groups.get(g1) ?? [];
      const list2 = groups.get(g2) ?? [];

      for (const item1 of list1) {
        for (const item2 of list2) {
          if (canMerge(item1.mask, item2.mask)) {
            item1.used = true;
            item2.used = true;
            const mergedMask = mergeMask(item1.mask, item2.mask);

            if (!seenMasks.has(mergedMask)) {
              seenMasks.add(mergedMask);
              const combinedMinterms = new Set([...item1.minterms, ...item2.minterms]);
              const nextOnes = countOnes(mergedMask);
              if (!nextGroups.has(nextOnes)) nextGroups.set(nextOnes, []);
              nextGroups.get(nextOnes)!.push({
                mask: mergedMask,
                minterms: combinedMinterms,
                used: false,
              });
            }
          }
        }
      }
    }

    // Collect unused items as prime implicants
    for (const list of groups.values()) {
      for (const item of list) {
        if (!item.used && !primeImplicantsList.some(pi => pi.mask === item.mask)) {
          primeImplicantsList.push(item);
        }
      }
    }

    groups = nextGroups;
  }

  // Convert to PrimeImplicant structures
  const piObjects: PrimeImplicant[] = primeImplicantsList.map(pi => ({
    binary: pi.mask,
    term: maskToTerm(pi.mask, variables),
    minterms: Array.from(pi.minterms).sort((a, b) => a - b),
    isEssential: false,
  }));

  // Build Prime Implicant Table for mandatory minterms (excluding dontCares)
  const mintermSet = new Set(minterms);
  const targetMinterms = minterms.filter(m => mintermSet.has(m));

  // Determine Essential Prime Implicants
  const essentialSet = new Set<string>();
  for (const m of targetMinterms) {
    const covering = piObjects.filter(pi => pi.minterms.includes(m));
    if (covering.length === 1) {
      covering[0].isEssential = true;
      essentialSet.add(covering[0].binary);
    }
  }

  const essentialPIs = piObjects.filter(pi => pi.isEssential);

  // Find all minimal solutions using branch-and-bound covering
  const solutions = findMinimalCovers(piObjects, targetMinterms, variables);

  return {
    variables,
    primeImplicants: piObjects,
    essentialPrimeImplicants: essentialPIs,
    minimalSolutions: solutions,
    bestExpression: solutions[0]?.expression ?? '0',
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function countOnes(mask: string): number {
  let count = 0;
  for (const c of mask) if (c === '1') count++;
  return count;
}

function canMerge(m1: string, m2: string): boolean {
  let diffCount = 0;
  for (let i = 0; i < m1.length; i++) {
    if (m1[i] !== m2[i]) {
      if (m1[i] === '-' || m2[i] === '-') return false;
      diffCount++;
      if (diffCount > 1) return false;
    }
  }
  return diffCount === 1;
}

function mergeMask(m1: string, m2: string): string {
  let res = '';
  for (let i = 0; i < m1.length; i++) {
    res += m1[i] === m2[i] ? m1[i] : '-';
  }
  return res;
}

export function maskToTerm(mask: string, variables: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < mask.length; i++) {
    const bit = mask[i];
    if (bit === '1') parts.push(variables[i]);
    else if (bit === '0') parts.push(`${variables[i]}'`);
  }
  return parts.length === 0 ? '1' : parts.join('');
}

function calculateCost(terms: string[]): SimplificationCost {
  if (terms.length === 0) return { literals: 0, terms: 0, gates: 0, depth: 0 };
  if (terms.length === 1 && terms[0] === '1') return { literals: 0, terms: 1, gates: 0, depth: 0 };
  if (terms.length === 1 && terms[0] === '0') return { literals: 0, terms: 0, gates: 0, depth: 0 };

  let totalLiterals = 0;
  let andGates = 0;
  const inverters = new Set<string>();

  for (const t of terms) {
    const lits = t.match(/[A-Z]'?/g) ?? [];
    totalLiterals += lits.length;
    if (lits.length > 1) andGates++;
    lits.forEach(l => {
      if (l.endsWith("'")) inverters.add(l[0]);
    });
  }

  const orGates = terms.length > 1 ? 1 : 0;
  const totalGates = andGates + orGates + inverters.size;
  const depth = (inverters.size > 0 ? 1 : 0) + (andGates > 0 ? 1 : 0) + (orGates > 0 ? 1 : 0);

  return {
    literals: totalLiterals,
    terms: terms.length,
    gates: totalGates,
    depth: Math.max(1, depth),
  };
}

function findMinimalCovers(
  pis: PrimeImplicant[],
  targetMinterms: number[],
  _variables: string[]
): MinimalSolution[] {
  if (targetMinterms.length === 0) {
    return [{ expression: '0', terms: [], cost: calculateCost([]) }];
  }

  // Pre-filter: essential prime implicants must be in the cover
  const essentialPis = pis.filter(p => p.isEssential);
  const coveredByEssential = new Set<number>();
  for (const epi of essentialPis) {
    for (const m of epi.minterms) coveredByEssential.add(m);
  }

  const remainingMinterms = targetMinterms.filter(m => !coveredByEssential.has(m));
  const remainingPis = pis.filter(p => !p.isEssential);

  // If all minterms already covered by essential PIs
  if (remainingMinterms.length === 0) {
    const terms = essentialPis.map(p => p.term);
    const expr = terms.join(' + ') || '1';
    return [{ expression: expr, terms, cost: calculateCost(terms) }];
  }

  // Branch & bound to find all minimal subsets of remainingPis covering remainingMinterms
  const validCovers: PrimeImplicant[][] = [];
  let minCoverSize = Infinity;

  function search(idx: number, currentSelected: PrimeImplicant[], uncovered: Set<number>) {
    if (uncovered.size === 0) {
      const fullCover = [...essentialPis, ...currentSelected];
      if (fullCover.length < minCoverSize) {
        minCoverSize = fullCover.length;
        validCovers.length = 0;
        validCovers.push(fullCover);
      } else if (fullCover.length === minCoverSize) {
        validCovers.push(fullCover);
      }
      return;
    }

    if (idx >= remainingPis.length || currentSelected.length + essentialPis.length >= minCoverSize) {
      return;
    }

    const pi = remainingPis[idx];

    // Branch 1: include this PI if it covers at least one uncovered minterm
    const newCoveredCount = pi.minterms.filter(m => uncovered.has(m)).length;
    if (newCoveredCount > 0) {
      const nextUncovered = new Set(uncovered);
      pi.minterms.forEach(m => nextUncovered.delete(m));
      search(idx + 1, [...currentSelected, pi], nextUncovered);
    }

    // Branch 2: skip this PI
    search(idx + 1, currentSelected, uncovered);
  }

  search(0, [], new Set(remainingMinterms));

  if (validCovers.length === 0) {
    // Fallback: use all PIs
    const terms = pis.map(p => p.term);
    return [{ expression: terms.join(' + '), terms, cost: calculateCost(terms) }];
  }

  // Deduplicate and rank solutions by total literals then total gates
  const seenExpressions = new Set<string>();
  const solutions: MinimalSolution[] = [];

  for (const cover of validCovers) {
    const terms = cover.map(p => p.term).sort();
    const expr = terms.join(' + ');
    if (!seenExpressions.has(expr)) {
      seenExpressions.add(expr);
      solutions.push({
        expression: expr,
        terms,
        cost: calculateCost(terms),
      });
    }
  }

  // Sort solutions by least literals then least gates
  solutions.sort((a, b) => {
    if (a.cost.literals !== b.cost.literals) return a.cost.literals - b.cost.literals;
    if (a.cost.terms !== b.cost.terms) return a.cost.terms - b.cost.terms;
    return a.cost.gates - b.cost.gates;
  });

  return solutions;
}
