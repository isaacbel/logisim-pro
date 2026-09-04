/**
 * Boolean Algebra Analysis
 * Generates canonical SOP/POS forms from a truth table output column.
 */

import type { BooleanAnalysisResult } from '@apptypes/core';
import { SignalValue } from '@apptypes/core';

/**
 * Given a truth table output column (0/1/X per row), compute:
 * - canonical minterms & SOP
 * - canonical maxterms & POS
 * - a minimized expression using basic grouping
 */
export function analyzeBooleanFunction(
  variables: string[],
  outputValues: (SignalValue | 0 | 1 | 'X')[],
): BooleanAnalysisResult {
  const n = variables.length;
  const minterms: number[] = [];
  const maxterms: number[] = [];

  for (let i = 0; i < outputValues.length; i++) {
    const v = outputValues[i];
    const isHigh = v === 1 || (v as number) === (SignalValue.HIGH as number);
    const isLow = v === 0 || (v as number) === (SignalValue.LOW as number);
    if (isHigh) minterms.push(i);
    else if (isLow) maxterms.push(i);
  }

  const sop = buildSOP(minterms, variables, n);
  const pos = buildPOS(maxterms, variables, n);
  const minimized = minimizeExpression(minterms, variables, n);

  return {
    sop,
    pos,
    canonicalMinterms: minterms,
    canonicalMaxterms: maxterms,
    minimizedExpression: minimized,
  };
}

function buildSOP(minterms: number[], variables: string[], n: number): string {
  if (minterms.length === 0) return '0';
  if (minterms.length === 1 << n) return '1';
  const terms = minterms.map(m => mintermToProduct(m, variables, n));
  return terms.join(' + ');
}

function buildPOS(maxterms: number[], variables: string[], n: number): string {
  if (maxterms.length === 0) return '1';
  if (maxterms.length === 1 << n) return '0';
  const terms = maxterms.map(m => maxtermToSum(m, variables, n));
  return terms.map(t => `(${t})`).join(' · ');
}

function mintermToProduct(minterm: number, variables: string[], n: number): string {
  return variables
    .map((v, i) => {
      const bit = (minterm >> (n - 1 - i)) & 1;
      return bit === 1 ? v : `${v}'`;
    })
    .join('');
}

function maxtermToSum(maxterm: number, variables: string[], n: number): string {
  return variables
    .map((v, i) => {
      const bit = (maxterm >> (n - 1 - i)) & 1;
      return bit === 0 ? v : `${v}'`;
    })
    .join(' + ');
}

/**
 * Simplified minimization using a greedy grouping approach.
 * For a full Quine-McCluskey, a dedicated library would be needed.
 */
function minimizeExpression(minterms: number[], variables: string[], n: number): string {
  if (minterms.length === 0) return '0';
  if (minterms.length === 1 << n) return '1';

  const groups = findPrimeImplicants(minterms, n);
  const terms = groups.map(group => groupToTerm(group, variables, n));
  const uniqueTerms = [...new Set(terms)];
  return uniqueTerms.join(' + ') || buildSOP(minterms, variables, n);
}

function findPrimeImplicants(minterms: number[], n: number): number[][] {
  const result: number[][] = [];
  const covered = new Set<number>();

  // Try to merge minterms differing by 1 bit
  for (let i = 0; i < minterms.length; i++) {
    for (let j = i + 1; j < minterms.length; j++) {
      const diff = minterms[i] ^ minterms[j];
      if (isPowerOfTwo(diff)) {
        result.push([minterms[i], minterms[j]]);
        covered.add(minterms[i]);
        covered.add(minterms[j]);
      }
    }
  }

  // Add uncovered single minterms
  for (const m of minterms) {
    if (!covered.has(m)) {
      result.push([m]);
    }
  }

  void n; // used via minterms constraints
  return result;
}

function groupToTerm(group: number[], variables: string[], n: number): string {
  if (group.length === 1) return mintermToProduct(group[0], variables, n);
  const diff = group.reduce((acc, m) => acc | (m ^ group[0]), 0);
  const terms: string[] = [];
  for (let i = 0; i < n; i++) {
    const bitPos = n - 1 - i;
    if ((diff >> bitPos) & 1) continue; // this bit varies → eliminate
    const bit = (group[0] >> bitPos) & 1;
    terms.push(bit === 1 ? variables[i] : `${variables[i]}'`);
  }
  return terms.length > 0 ? terms.join('') : '1';
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
