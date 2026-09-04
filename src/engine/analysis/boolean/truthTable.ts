/**
 * Truth Table Generator
 * Evaluates all 2^N combinations for a given Boolean AST or expression
 */

import { ASTNode, extractVariables } from './ast';
import { evaluateAST } from './evaluator';
import { parseBooleanExpression } from './parser';

export interface TruthTableRow {
  index: number;
  binary: string;
  inputs: Record<string, 0 | 1>;
  output: 0 | 1;
}

export interface TruthTableData {
  variables: string[];
  rows: TruthTableRow[];
  minterms: number[];
  maxterms: number[];
  rowCount: number;
}

/**
 * Generate a complete truth table for an AST or string expression
 */
export function generateTruthTable(input: ASTNode | string, explicitVariables?: string[]): TruthTableData {
  const ast: ASTNode = typeof input === 'string' ? parseBooleanExpression(input) : input;
  const variables = explicitVariables && explicitVariables.length > 0
    ? [...explicitVariables].sort()
    : extractVariables(ast);

  const n = variables.length;
  if (n > 6) {
    throw new Error(`Nombre de variables trop élevé (${n} > 6). La table de vérité est limitée à 6 variables (64 lignes).`);
  }

  const rowCount = 1 << n;
  const rows: TruthTableRow[] = [];
  const minterms: number[] = [];
  const maxterms: number[] = [];

  for (let i = 0; i < rowCount; i++) {
    const inputs: Record<string, 0 | 1> = {};
    let binary = '';

    for (let bit = 0; bit < n; bit++) {
      const varBit = ((i >> (n - 1 - bit)) & 1) as 0 | 1;
      const varName = variables[bit];
      inputs[varName] = varBit;
      binary += varBit.toString();
    }

    const output = evaluateAST(ast, inputs);
    if (output === 1) {
      minterms.push(i);
    } else {
      maxterms.push(i);
    }

    rows.push({
      index: i,
      binary,
      inputs,
      output,
    });
  }

  return {
    variables,
    rows,
    minterms,
    maxterms,
    rowCount,
  };
}

/**
 * Export truth table as CSV text
 */
export function exportTruthTableToCSV(table: TruthTableData, outputLabel = 'F'): string {
  const headers = [...table.variables, outputLabel].join(',');
  const lines = table.rows.map(r => {
    const inVals = table.variables.map(v => r.inputs[v]);
    return [...inVals, r.output].join(',');
  });
  return [headers, ...lines].join('\n');
}
