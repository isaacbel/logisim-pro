/**
 * Strict Karnaugh Map Result Validator (2 to 6 variables)
 * Compares truth table output of derived expression against original 1s and 0s across all planes.
 */

import { parseBooleanExpression } from '../boolean/parser';
import { evaluateAST } from '../boolean/evaluator';
import { KMapStructure } from './kmap';

export function validateKMapResult(
  structure: KMapStructure,
  derivedExpression: string
): { isValid: boolean; mismatches: number[] } {
  const { variables, planes } = structure;
  const n = variables.length;
  const mismatches: number[] = [];

  let ast;
  try {
    ast = parseBooleanExpression(derivedExpression);
  } catch {
    return { isValid: false, mismatches: [-1] };
  }

  // Iterate over all cells across all planes
  planes.forEach(plane => {
    plane.grid.forEach(row => {
      row.forEach(cell => {
        // If cell is 'X', it can be either 0 or 1, so no mismatch is possible
        if (cell.value === 'X') return;

        const inputs: Record<string, 0 | 1> = {};
        for (let bit = 0; bit < n; bit++) {
          const varBit = ((cell.minterm >> (n - 1 - bit)) & 1) as 0 | 1;
          inputs[variables[bit]] = varBit;
        }

        const evalResult = evaluateAST(ast, inputs);
        if (evalResult !== cell.value) {
          mismatches.push(cell.minterm);
        }
      });
    });
  });

  return {
    isValid: mismatches.length === 0,
    mismatches,
  };
}
