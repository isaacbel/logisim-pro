/**
 * Canonical Maxterms (POS) Utility
 */

export function maxtermToSum(maxterm: number, variables: string[]): string {
  const n = variables.length;
  return variables
    .map((v, i) => {
      const bit = (maxterm >> (n - 1 - i)) & 1;
      return bit === 0 ? v : `${v}'`;
    })
    .join(' + ');
}

export function buildCanonicalPOS(maxterms: number[], variables: string[]): {
  piNotation: string;
  expandedPOS: string;
  binaryList: { index: number; binary: string; term: string }[];
} {
  const n = variables.length;
  const total = 1 << n;

  const piNotation = maxterms.length === 0
    ? '1'
    : maxterms.length === total
    ? '0'
    : `ΠM(${maxterms.join(', ')})`;

  const binaryList = maxterms.map(m => ({
    index: m,
    binary: m.toString(2).padStart(n, '0'),
    term: `(${maxtermToSum(m, variables)})`,
  }));

  const expandedPOS = maxterms.length === 0
    ? '1'
    : maxterms.length === total
    ? '0'
    : binaryList.map(b => b.term).join(' · ');

  return {
    piNotation,
    expandedPOS,
    binaryList,
  };
}
