/**
 * Converts Selected K-Map Groups into Formatted Boolean Expressions
 */

import { KMapGroupVisual } from './grouping';

export function kmapGroupsToExpression(
  groups: KMapGroupVisual[],
  mode: 'sop' | 'pos' | 'nand' | 'nor' = 'sop'
): string {
  if (groups.length === 0) return '0';
  if (groups.some(g => g.term === '1')) return '1';

  const terms = groups.map(g => g.term);

  if (mode === 'sop') {
    return terms.join(' + ');
  }

  if (mode === 'nand') {
    const nandTerms = terms.map(t => {
      const lits = t.match(/[A-Z]'?/g) ?? [];
      return `(${lits.join('·')})'`;
    });
    return nandTerms.length === 1 ? nandTerms[0] : `(${nandTerms.join('·')})'`;
  }

  if (mode === 'nor') {
    const norTerms = terms.map(t => {
      const lits = t.match(/[A-Z]'?/g) ?? [];
      return `(${lits.join('+')})'`;
    });
    return norTerms.length === 1 ? norTerms[0] : `(${norTerms.join('+')})'`;
  }

  return terms.join(' + ');
}
