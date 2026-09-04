/**
 * XOR / Parity Pattern Optimizer
 * Detects XOR/XNOR structures in Boolean functions that can reduce circuit cost.
 * Never replaces the core SOP engine — only offers XOR as an alternative when cheaper.
 */

import { SimplificationCost } from './quineMcCluskey';

export interface XorAnalysisResult {
  hasXorStructure: boolean;
  xorExpression: string;        // e.g. "A ⊕ B ⊕ C"
  xorCost: SimplificationCost;
  sopCost: SimplificationCost;
  isXorCheaper: boolean;
  explanation: string;
}

/**
 * Detects if a set of minterms represents a pure XOR/XNOR parity function,
 * and returns the simplified XOR expression if so.
 */
export function detectXorStructure(
  minterms: number[],
  variables: string[]
): XorAnalysisResult {
  const n = variables.length;
  const total = 1 << n;
  const mintermSet = new Set(minterms);

  // ── Check for pure odd parity: F=1 iff odd number of 1-bits in input ──────
  if (minterms.length === total / 2 && minterms.every(m => countBits(m, n) % 2 === 1)) {
    const xorExpr = variables.join(' ⊕ ');
    const xorCost: SimplificationCost = {
      literals: n,
      terms: 1,
      gates: Math.max(1, n - 1),
      depth: Math.ceil(Math.log2(Math.max(n, 1))),
    };
    const sopCost = estimateSopCost(minterms, n);
    return {
      hasXorStructure: true,
      xorExpression: xorExpr,
      xorCost,
      sopCost,
      isXorCheaper: xorCost.gates <= sopCost.gates,
      explanation: `La fonction est une fonction de parité impaire. Elle vaut 1 si et seulement si le nombre d'entrées à 1 est impair. Elle se réalise avec ${n - 1} porte(s) XOR en cascade.`,
    };
  }

  // ── Check for pure even parity: F=1 iff even number of 1-bits in input ────
  if (minterms.length === total / 2 && minterms.every(m => countBits(m, n) % 2 === 0)) {
    const xorExpr = `(${variables.join(' ⊕ ')})'`;
    const xorCost: SimplificationCost = {
      literals: n,
      terms: 1,
      gates: Math.max(1, n - 1) + 1, // +1 for the XNOR/inverter at the end
      depth: Math.ceil(Math.log2(Math.max(n, 1))) + 1,
    };
    const sopCost = estimateSopCost(minterms, n);
    return {
      hasXorStructure: true,
      xorExpression: xorExpr,
      xorCost,
      sopCost,
      isXorCheaper: xorCost.gates <= sopCost.gates,
      explanation: `La fonction est une fonction de parité paire (XNOR). Elle vaut 1 si et seulement si le nombre d'entrées à 1 est pair. Elle se réalise avec ${n - 1} porte(s) XOR plus un inverseur final.`,
    };
  }

  // ── Check for partial XOR patterns (e.g., F = A⊕B + C) ───────────────────
  // Detect 2-variable XOR sub-patterns in the minterm set
  for (let v1 = 0; v1 < n; v1++) {
    for (let v2 = v1 + 1; v2 < n; v2++) {
      if (isXorPairPattern(mintermSet, v1, v2, n, total)) {
        const remainingVars = variables.filter((_, i) => i !== v1 && i !== v2);
        const xorPart = `${variables[v1]} ⊕ ${variables[v2]}`;
        const fullExpr = remainingVars.length > 0
          ? `(${xorPart})·${remainingVars.join('·')}`
          : xorPart;

        const xorCost: SimplificationCost = {
          literals: 2 + remainingVars.length,
          terms: 1,
          gates: 1 + remainingVars.length,
          depth: 1 + (remainingVars.length > 0 ? 1 : 0),
        };
        const sopCost = estimateSopCost(minterms, n);

        return {
          hasXorStructure: true,
          xorExpression: fullExpr,
          xorCost,
          sopCost,
          isXorCheaper: xorCost.gates < sopCost.gates,
          explanation: `Les variables ${variables[v1]} et ${variables[v2]} forment un motif XOR détecté. Cela peut réduire le coût en portes par rapport à la forme SOP.`,
        };
      }
    }
  }

  const sopCost = estimateSopCost(minterms, n);
  return {
    hasXorStructure: false,
    xorExpression: '',
    xorCost: { literals: 0, terms: 0, gates: 0, depth: 0 },
    sopCost,
    isXorCheaper: false,
    explanation: 'Aucune structure XOR/parité détectée dans cette fonction.',
  };
}

/**
 * Expands a pure XOR/parity expression into AND/OR/NOT for gate-level simulation.
 * A ⊕ B = A.B' + A'.B
 */
export function expandXorPairToAndOrNot(varA: string, varB: string): string {
  return `${varA}.${varB}' + ${varA}'.${varB}`;
}

/**
 * Expands full n-variable XOR parity into AND/OR/NOT chains.
 */
export function expandXorToAndOrNot(variables: string[]): string {
  if (variables.length === 0) return '0';
  if (variables.length === 1) return variables[0];
  if (variables.length === 2) return expandXorPairToAndOrNot(variables[0], variables[1]);
  // Reduce from left: (A⊕B)⊕C = (A.B'+A'.B).C' + (A.B+A'.B').C
  const pairExpr = expandXorPairToAndOrNot(variables[0], variables[1]);
  const rest = variables.slice(2);
  const inner = expandXorToAndOrNot([`(${pairExpr})`, ...rest]);
  return inner;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function countBits(n: number, bits: number): number {
  let count = 0;
  for (let i = 0; i < bits; i++) count += (n >> i) & 1;
  return count;
}

function estimateSopCost(minterms: number[], n: number): SimplificationCost {
  // Rough estimate: number of minterms / 2 terms, n literals each
  const terms = Math.max(1, Math.floor(minterms.length / 2));
  return {
    literals: terms * Math.ceil(n / 2),
    terms,
    gates: terms + (terms > 1 ? 1 : 0),
    depth: (n > 1 ? 1 : 0) + (terms > 1 ? 1 : 0),
  };
}

function isXorPairPattern(
  mintermSet: Set<number>,
  v1: number,
  v2: number,
  n: number,
  total: number
): boolean {
  // For all input combinations where bits outside v1 and v2 are fixed,
  // check if F depends on XOR of v1 and v2
  const mask1 = 1 << (n - 1 - v1);
  const mask2 = 1 << (n - 1 - v2);
  const otherMask = ((1 << n) - 1) & ~mask1 & ~mask2;

  // Iterate over all "other" bit patterns
  for (let other = 0; other < total; other++) {
    if ((other & ~otherMask) !== 0) continue; // skip if other bits aren't in the "other" mask

    // All four combinations
    const m00 = other;
    const m01 = other | mask2;
    const m10 = other | mask1;
    const m11 = other | mask1 | mask2;

    const f00 = mintermSet.has(m00) ? 1 : 0;
    const f01 = mintermSet.has(m01) ? 1 : 0;
    const f10 = mintermSet.has(m10) ? 1 : 0;
    const f11 = mintermSet.has(m11) ? 1 : 0;

    // XOR pattern: f(0,0) == f(1,1) and f(0,1) == f(1,0) and f(0,0) != f(0,1)
    if (!(f00 === f11 && f01 === f10 && f00 !== f01)) return false;
  }

  return true;
}
