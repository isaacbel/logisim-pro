/**
 * Don't-Care Term Handling for Karnaugh Maps
 */

export function extractMintermsAndDontCares(grid: { value: 0 | 1 | 'X'; minterm: number }[][]): {
  minterms: number[];
  dontCares: number[];
} {
  const minterms: number[] = [];
  const dontCares: number[] = [];

  grid.forEach(row => {
    row.forEach(cell => {
      if (cell.value === 1) minterms.push(cell.minterm);
      else if (cell.value === 'X') dontCares.push(cell.minterm);
    });
  });

  return {
    minterms: minterms.sort((a, b) => a - b),
    dontCares: dontCares.sort((a, b) => a - b),
  };
}
