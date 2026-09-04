/**
 * Boolean Expression Optimizer
 * Provides multi-target conversions: Minimal SOP, Minimal POS, All-NAND, All-NOR,
 * Minimum Terms, Minimum Depth, Balanced, and XOR-Optimized.
 */

import { ASTNode, extractVariables } from './ast';
import { parseBooleanExpression } from './parser';
import { generateTruthTable } from './truthTable';
import { quineMcCluskey } from './quineMcCluskey';
import { detectXorStructure } from './xorOptimizer';
import { analyzeExpressionTiming } from './propagationAnalyzer';

export type OptimizationMode =
  | 'minimal-sop'
  | 'minimal-pos'
  | 'all-nand'
  | 'all-nor'
  | 'min-literals'
  | 'min-gates'
  | 'min-terms'
  | 'min-depth'
  | 'balanced'
  | 'xor-optimized';

export interface OptimizedResult {
  mode: OptimizationMode;
  expression: string;
  ast: ASTNode;
  gateCount: number;
  literalCount: number;
  termCount: number;
  depth: number;
  description: string;
  xorDetected?: boolean;
}

export function optimizeExpression(
  input: ASTNode | string,
  mode: OptimizationMode = 'minimal-sop'
): OptimizedResult {
  const ast: ASTNode = typeof input === 'string' ? parseBooleanExpression(input) : input;
  const variables = extractVariables(ast);
  const table = generateTruthTable(ast, variables);

  switch (mode) {
    case 'minimal-sop':
    case 'min-literals':
    case 'min-gates': {
      const qm = quineMcCluskey(table.minterms, [], variables);
      const bestExpr = qm.bestExpression;
      const bestAST = parseBooleanExpression(bestExpr);
      const timing = analyzeExpressionTiming(bestAST);
      return {
        mode,
        expression: bestExpr,
        ast: bestAST,
        gateCount: qm.minimalSolutions[0]?.cost.gates ?? 1,
        literalCount: qm.minimalSolutions[0]?.cost.literals ?? 1,
        termCount: qm.minimalSolutions[0]?.cost.terms ?? 1,
        depth: timing.gateDepth,
        description: "Forme disjonctive minimale standard (Somme de produits) optimisée par Quine-McCluskey.",
      };
    }

    case 'min-terms': {
      // Sort all minimal solutions by number of terms (ascending)
      const qm = quineMcCluskey(table.minterms, [], variables);
      const byTerms = [...qm.minimalSolutions].sort((a, b) => a.cost.terms - b.cost.terms);
      const best = byTerms[0] ?? qm.minimalSolutions[0];
      const bestExpr = best?.expression ?? '0';
      const bestAST = parseBooleanExpression(bestExpr);
      const timing = analyzeExpressionTiming(bestAST);
      return {
        mode,
        expression: bestExpr,
        ast: bestAST,
        gateCount: best?.cost.gates ?? 0,
        literalCount: best?.cost.literals ?? 0,
        termCount: best?.cost.terms ?? 0,
        depth: timing.gateDepth,
        description: 'Optimisation minimisant le nombre de termes produits (portes AND de premier niveau).',
      };
    }

    case 'min-depth': {
      // Among all minimal solutions, pick the one with minimum gate depth
      const qm = quineMcCluskey(table.minterms, [], variables);
      let bestSol = qm.minimalSolutions[0];
      let bestDepth = Infinity;
      for (const sol of qm.minimalSolutions) {
        try {
          const d = analyzeExpressionTiming(sol.expression).gateDepth;
          if (d < bestDepth) { bestDepth = d; bestSol = sol; }
        } catch { /* skip invalid */ }
      }
      const expr = bestSol?.expression ?? '0';
      const solAST = parseBooleanExpression(expr);
      return {
        mode,
        expression: expr,
        ast: solAST,
        gateCount: bestSol?.cost.gates ?? 0,
        literalCount: bestSol?.cost.literals ?? 0,
        termCount: bestSol?.cost.terms ?? 0,
        depth: bestDepth === Infinity ? 0 : bestDepth,
        description: 'Optimisation minimisant la profondeur de chemin critique (délai de propagation).',
      };
    }

    case 'balanced': {
      // Weighted combination: minimize gates*0.6 + depth*0.4
      const qm = quineMcCluskey(table.minterms, [], variables);
      let bestSol = qm.minimalSolutions[0];
      let bestScore = Infinity;
      for (const sol of qm.minimalSolutions) {
        try {
          const d = analyzeExpressionTiming(sol.expression).gateDepth;
          const score = sol.cost.gates * 0.6 + d * 0.4;
          if (score < bestScore) { bestScore = score; bestSol = sol; }
        } catch { /* skip */ }
      }
      const expr = bestSol?.expression ?? '0';
      const solAST = parseBooleanExpression(expr);
      const timing = analyzeExpressionTiming(solAST);
      return {
        mode,
        expression: expr,
        ast: solAST,
        gateCount: bestSol?.cost.gates ?? 0,
        literalCount: bestSol?.cost.literals ?? 0,
        termCount: bestSol?.cost.terms ?? 0,
        depth: timing.gateDepth,
        description: 'Optimisation équilibrée : compromis entre coût en portes (60%) et profondeur logique (40%).',
      };
    }

    case 'xor-optimized': {
      // Detect XOR structure. If cheaper than SOP, use it; otherwise fall back to minimal SOP.
      const xorResult = detectXorStructure(table.minterms, variables);
      const qm = quineMcCluskey(table.minterms, [], variables);
      const sopExpr = qm.bestExpression;

      if (xorResult.hasXorStructure && xorResult.isXorCheaper) {
        const xorAST = parseBooleanExpression(xorResult.xorExpression);
        const timing = analyzeExpressionTiming(xorAST);
        return {
          mode,
          expression: xorResult.xorExpression,
          ast: xorAST,
          gateCount: xorResult.xorCost.gates,
          literalCount: xorResult.xorCost.literals,
          termCount: xorResult.xorCost.terms,
          depth: timing.gateDepth,
          description: `Structure XOR/parité détectée et appliquée. ${xorResult.explanation}`,
          xorDetected: true,
        };
      }

      const bestAST = parseBooleanExpression(sopExpr);
      const timing = analyzeExpressionTiming(bestAST);
      return {
        mode,
        expression: sopExpr,
        ast: bestAST,
        gateCount: qm.minimalSolutions[0]?.cost.gates ?? 0,
        literalCount: qm.minimalSolutions[0]?.cost.literals ?? 0,
        termCount: qm.minimalSolutions[0]?.cost.terms ?? 0,
        depth: timing.gateDepth,
        description: 'Aucune structure XOR détectée. Retour à la forme SOP minimale.',
        xorDetected: false,
      };
    }

    case 'minimal-pos': {
      // Quine-McCluskey on maxterms gives the minimal SOP of F'
      // By De Morgan, inverting the literals and operators gives minimal POS of F
      const qmComplement = quineMcCluskey(table.maxterms, [], variables);
      const complementExpr = qmComplement.bestExpression;

      if (complementExpr === '0') {
        return {
        mode: 'minimal-pos',
        expression: '1',
        ast: parseBooleanExpression('1'),
        gateCount: 0,
        literalCount: 0,
        termCount: 0,
        depth: 0,
        description: "Forme conjonctive minimale (Tautologie 1).",
      };
    }
    if (complementExpr === '1') {
      return {
        mode: 'minimal-pos',
        expression: '0',
        ast: parseBooleanExpression('0'),
        gateCount: 0,
        literalCount: 0,
        termCount: 0,
        depth: 0,
        description: "Forme conjonctive minimale (Contradiction 0).",
      };
    }

      // Convert complement SOP to POS
      const posTerms = qmComplement.minimalSolutions[0]?.terms.map(product => {
        const literals = product.match(/[A-Z]'?/g) ?? [];
        const invertedLits = literals.map(l => (l.endsWith("'") ? l[0] : `${l}'`));
        return `(${invertedLits.join(' + ')})`;
      }) ?? [];

      const posExpr = posTerms.join(' · ') || '1';
      const posAST = parseBooleanExpression(posExpr);
      const posTiming = analyzeExpressionTiming(posAST);
      return {
        mode: 'minimal-pos',
        expression: posExpr,
        ast: posAST,
        gateCount: (qmComplement.minimalSolutions[0]?.cost.gates ?? 1),
        literalCount: (qmComplement.minimalSolutions[0]?.cost.literals ?? 1),
        termCount: posTerms.length,
        depth: posTiming.gateDepth,
        description: "Forme conjonctive minimale (Produit de sommes) déduite par dualité De Morgan.",
      };
    }

    case 'all-nand': {
      // Convert SOP: A.B + C.D into ((A.B)' . (C.D)')' (Universal NAND)
      const qm = quineMcCluskey(table.minterms, [], variables);
      const terms = qm.minimalSolutions[0]?.terms ?? [];

      if (terms.length === 0 || qm.bestExpression === '0') {
        const c0AST = parseBooleanExpression("(A.A')'");
        return {
          mode: 'all-nand',
          expression: "(A.A')'",
          ast: c0AST,
          gateCount: 1,
          literalCount: 2,
          termCount: 1,
          depth: 2,
          description: "Réalisation universelle Tout-NAND (Constante 0).",
        };
      }

      // Format as NAND expression
      const nandTerms = terms.map(t => {
        const lits = t.match(/[A-Z]'?/g) ?? [];
        return `(${lits.join('·')})'`;
      });

      const nandExpr = nandTerms.length === 1 ? nandTerms[0] : `(${nandTerms.join('·')})'`;
      const nandAST = parseBooleanExpression(nandExpr);
      const nandTiming = analyzeExpressionTiming(nandAST);
      return {
        mode: 'all-nand',
        expression: nandExpr,
        ast: nandAST,
        gateCount: terms.length + 1,
        literalCount: qm.minimalSolutions[0]?.cost.literals ?? 1,
        termCount: terms.length,
        depth: nandTiming.gateDepth,
        description: "Réalisation universelle Tout-NAND (2 niveaux d'inversion NAND équivalents à ET-OU).",
      };
    }

    case 'all-nor': {
      // Convert POS: (A+B).(C+D) into ((A+B)' + (C+D)')' (Universal NOR)
      const qmComp = quineMcCluskey(table.maxterms, [], variables);
      const terms = qmComp.minimalSolutions[0]?.terms ?? [];

      const norTerms = terms.map(product => {
        const literals = product.match(/[A-Z]'?/g) ?? [];
        const invertedLits = literals.map(l => (l.endsWith("'") ? l[0] : `${l}'`));
        return `(${invertedLits.join('+')})'`;
      });

      const norExpr = norTerms.length === 1 ? norTerms[0] : `(${norTerms.join('+')})'`;
      const norAST = parseBooleanExpression(norExpr);
      const norTiming = analyzeExpressionTiming(norAST);
      return {
        mode: 'all-nor',
        expression: norExpr,
        ast: norAST,
        gateCount: terms.length + 1,
        literalCount: qmComp.minimalSolutions[0]?.cost.literals ?? 1,
        termCount: terms.length,
        depth: norTiming.gateDepth,
        description: "Réalisation universelle Tout-NOR (2 niveaux d'inversion NOR équivalents à OU-ET).",
      };
    }
  }
}
