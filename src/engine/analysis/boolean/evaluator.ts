/**
 * Boolean AST Evaluator
 * Evaluates an AST given variable assignments { [varName: string]: 0 | 1 }
 */

import { ASTNode } from './ast';

export type VariableEnvironment = Record<string, 0 | 1 | boolean>;

export function evaluateAST(node: ASTNode, env: VariableEnvironment): 0 | 1 {
  switch (node.type) {
    case 'CONST':
      return node.value;

    case 'VAR': {
      const val = env[node.name] ?? env[node.name.toUpperCase()];
      if (val === undefined) {
        throw new Error(`Variable non définie dans l'environnement: '${node.name}'`);
      }
      return val === 1 || val === true ? 1 : 0;
    }

    case 'NOT':
      return evaluateAST(node.child, env) === 1 ? 0 : 1;

    case 'AND': {
      for (const child of node.children) {
        if (evaluateAST(child, env) === 0) return 0;
      }
      return 1;
    }

    case 'OR': {
      for (const child of node.children) {
        if (evaluateAST(child, env) === 1) return 1;
      }
      return 0;
    }

    case 'XOR': {
      let sum = 0;
      for (const child of node.children) {
        sum ^= evaluateAST(child, env);
      }
      return sum as 0 | 1;
    }

    case 'NAND': {
      for (const child of node.children) {
        if (evaluateAST(child, env) === 0) return 1;
      }
      return 0;
    }

    case 'NOR': {
      for (const child of node.children) {
        if (evaluateAST(child, env) === 1) return 0;
      }
      return 1;
    }

    case 'XNOR': {
      let sum = 0;
      for (const child of node.children) {
        sum ^= evaluateAST(child, env);
      }
      return (sum === 1 ? 0 : 1) as 0 | 1;
    }
  }
}
