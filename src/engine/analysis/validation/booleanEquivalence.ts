/**
 * Formal Boolean Equivalence Checker
 * Evaluates whether two expressions/ASTs produce identical truth table outputs on 100% of rows.
 */

import { ASTNode, extractVariables } from '../boolean/ast';
import { parseBooleanExpression } from '../boolean/parser';
import { evaluateAST } from '../boolean/evaluator';

export interface EquivalenceCheckResult {
  isEquivalent: boolean;
  variables: string[];
  totalRows: number;
  failingRow?: {
    index: number;
    inputs: Record<string, 0 | 1>;
    outputExpr1: 0 | 1;
    outputExpr2: 0 | 1;
  };
}

export function checkBooleanEquivalence(
  expr1: ASTNode | string,
  expr2: ASTNode | string
): EquivalenceCheckResult {
  const ast1: ASTNode = typeof expr1 === 'string' ? parseBooleanExpression(expr1) : expr1;
  const ast2: ASTNode = typeof expr2 === 'string' ? parseBooleanExpression(expr2) : expr2;

  const vars1 = extractVariables(ast1);
  const vars2 = extractVariables(ast2);
  const allVars = Array.from(new Set([...vars1, ...vars2])).sort();

  const n = allVars.length;
  const totalRows = 1 << n;

  for (let i = 0; i < totalRows; i++) {
    const inputs: Record<string, 0 | 1> = {};
    for (let bit = 0; bit < n; bit++) {
      const varBit = ((i >> (n - 1 - bit)) & 1) as 0 | 1;
      inputs[allVars[bit]] = varBit;
    }

    const out1 = evaluateAST(ast1, inputs);
    const out2 = evaluateAST(ast2, inputs);

    if (out1 !== out2) {
      return {
        isEquivalent: false,
        variables: allVars,
        totalRows,
        failingRow: {
          index: i,
          inputs,
          outputExpr1: out1,
          outputExpr2: out2,
        },
      };
    }
  }

  return {
    isEquivalent: true,
    variables: allVars,
    totalRows,
  };
}
