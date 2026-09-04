/**
 * Canonical Minterms (SOP) Utility
 */

export function mintermToProduct(minterm: number, variables: string[]): string {
  const n = variables.length;
  return variables
    .map((v, i) => {
      const bit = (minterm >> (n - 1 - i)) & 1;
      return bit === 1 ? v : `${v}'`;
    })
    .join('');
}

export function buildCanonicalSOP(minterms: number[], variables: string[]): {
  sigmaNotation: string;
  expandedSOP: string;
  binaryList: { index: number; binary: string; term: string }[];
} {
  const n = variables.length;
  const total = 1 << n;

  const sigmaNotation = minterms.length === 0
    ? '0'
    : minterms.length === total
    ? '1'
    : `Σm(${minterms.join(', ')})`;

  const binaryList = minterms.map(m => ({
    index: m,
    binary: m.toString(2).padStart(n, '0'),
    term: mintermToProduct(m, variables),
  }));

  const expandedSOP = minterms.length === 0
    ? '0'
    : minterms.length === total
    ? '1'
    : binaryList.map(b => b.term).join(' + ');

  return {
    sigmaNotation,
    expandedSOP,
    binaryList,
  };
}
