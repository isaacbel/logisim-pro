/**
 * Step-by-Step Algebraic Boolean Simplifier
 * Produces structured educational derivation steps explaining every applied law.
 */

import { ASTNode, astToString, extractVariables } from './ast';
import { parseBooleanExpression } from './parser';
import { normalizeAST } from './normalizer';
import { BOOLEAN_LAWS } from './booleanLaws';
import { generateTruthTable } from './truthTable';
import { quineMcCluskey } from './quineMcCluskey';
import { evaluateAST } from './evaluator';

export interface SimplificationStep {
  step: number;
  before: string;
  law: string;
  after: string;
  explanation: string;
}

export interface SimplificationTraceResult {
  originalExpression: string;
  simplifiedExpression: string;
  steps: SimplificationStep[];
  isVerified: boolean;
  variables: string[];
}

export function simplifyStepByStep(input: ASTNode | string): SimplificationTraceResult {
  const ast: ASTNode = typeof input === 'string' ? parseBooleanExpression(input) : input;
  const variables = extractVariables(ast);
  const originalStr = astToString(ast);

  // Generate reference truth table for mathematical verification
  const refTable = generateTruthTable(ast, variables);

  const steps: SimplificationStep[] = [];
  let currentAST = ast;
  let currentStr = originalStr;
  let stepIndex = 1;

  // Step 1: Initial Normalization (Double negations, idempotence, constant folding)
  const normAST = normalizeAST(currentAST);
  const normStr = astToString(normAST);
  if (normStr !== currentStr) {
    steps.push({
      step: stepIndex++,
      before: currentStr,
      law: BOOLEAN_LAWS.involution.name,
      after: normStr,
      explanation: "Élimination des doubles négations et simplification des constantes et termes idempotents.",
    });
    currentAST = normAST;
    currentStr = normStr;
  }

  // Step 2: Test Absorption chains (e.g. A + A.B -> A, A + A'.B -> A + B)
  const afterAbsorption = applyAbsorption(currentAST);
  const absStr = astToString(afterAbsorption);
  if (absStr !== currentStr) {
    steps.push({
      step: stepIndex++,
      before: currentStr,
      law: BOOLEAN_LAWS.absorption.name,
      after: absStr,
      explanation: BOOLEAN_LAWS.absorption.explanation,
    });
    currentAST = afterAbsorption;
    currentStr = absStr;
  }

  // Step 3: Test Consensus theorem (e.g. A.B + A'.C + B.C -> A.B + A'.C)
  const afterConsensus = applyConsensus(currentAST);
  const conStr = astToString(afterConsensus);
  if (conStr !== currentStr) {
    steps.push({
      step: stepIndex++,
      before: currentStr,
      law: BOOLEAN_LAWS.consensus.name,
      after: conStr,
      explanation: BOOLEAN_LAWS.consensus.explanation,
    });
    currentAST = afterConsensus;
    currentStr = conStr;
  }

  // Step 4: Adjacency / Complement cancellation (e.g. A.B + A.B' -> A)
  const afterAdjacency = applyAdjacency(currentAST);
  const adjStr = astToString(afterAdjacency);
  if (adjStr !== currentStr) {
    steps.push({
      step: stepIndex++,
      before: currentStr,
      law: BOOLEAN_LAWS.adjacency.name,
      after: adjStr,
      explanation: BOOLEAN_LAWS.adjacency.explanation,
    });
    currentAST = afterAdjacency;
    currentStr = adjStr;
  }

  // Step 5: Quine-McCluskey Minimal Exact Form (if further reduction exists)
  const qm = quineMcCluskey(refTable.minterms, [], variables);
  const qmBest = qm.bestExpression;

  if (qmBest !== currentStr && qmBest !== '0' && qmBest !== '1') {
    steps.push({
      step: stepIndex++,
      before: currentStr,
      law: "Minimisation canonique exacte (Quine-McCluskey)",
      after: qmBest,
      explanation: "Sélection de la couverture minimale des implicants premiers avec coût en portes minimal.",
    });
    currentStr = qmBest;
  } else if (qmBest === '0' || qmBest === '1') {
    if (currentStr !== qmBest) {
      steps.push({
        step: stepIndex++,
        before: currentStr,
        law: qmBest === '0' ? BOOLEAN_LAWS.nullElement.name : BOOLEAN_LAWS.complement.name,
        after: qmBest,
        explanation: qmBest === '0' ? "Expression toujours fausse (0)." : "Expression toujours vraie (1, tautologie).",
      });
      currentStr = qmBest;
    }
  }

  // Final Strict Verification
  let isVerified = true;
  try {
    const finalAST = parseBooleanExpression(currentStr);
    for (const row of refTable.rows) {
      const simplifiedOutput = evaluateAST(finalAST, row.inputs);
      if (simplifiedOutput !== row.output) {
        isVerified = false;
        break;
      }
    }
  } catch {
    isVerified = false;
  }

  return {
    originalExpression: originalStr,
    simplifiedExpression: currentStr,
    steps,
    isVerified,
    variables,
  };
}

// ── Algebraic Pattern Rewriters ─────────────────────────────────────────────

function applyAbsorption(node: ASTNode): ASTNode {
  if (node.type === 'OR') {
    // Look for A + A.B -> A, or A + A'.B -> A + B
    const children = node.children;
    const filtered: ASTNode[] = [];
    const termStrings = children.map(c => astToString(c));

    for (let i = 0; i < children.length; i++) {
      const c1 = children[i];
      let absorbed = false;

      // Check if c1 is of form A.B... and some other term is A
      if (c1.type === 'AND') {
        const c1Literals = new Set(c1.children.map(c => astToString(c)));
        for (let j = 0; j < children.length; j++) {
          if (i === j) continue;
          const otherStr = termStrings[j];
          if (c1Literals.has(otherStr)) {
            // c1 contains a standalone term from the OR sum -> absorbed!
            absorbed = true;
            break;
          }
        }
      }

      if (!absorbed) {
        filtered.push(c1);
      }
    }

    if (filtered.length < children.length) {
      return normalizeAST({ type: 'OR', children: filtered });
    }
  }

  if ('children' in node) {
    return { ...node, children: node.children.map(applyAbsorption) };
  }
  if (node.type === 'NOT') {
    return { type: 'NOT', child: applyAbsorption(node.child) };
  }

  return node;
}

function applyConsensus(node: ASTNode): ASTNode {
  if (node.type === 'OR' && node.children.length >= 3) {
    // Look for AB + A'C + BC -> remove BC
    const terms = node.children;
    const termSets: { node: ASTNode; pos: Set<string>; neg: Set<string> }[] = [];

    for (const t of terms) {
      const pos = new Set<string>();
      const neg = new Set<string>();
      const factors = t.type === 'AND' ? t.children : [t];
      for (const f of factors) {
        if (f.type === 'VAR') pos.add(f.name);
        else if (f.type === 'NOT' && f.child.type === 'VAR') neg.add(f.child.name);
      }
      termSets.push({ node: t, pos, neg });
    }

    const consensusIndices = new Set<number>();

    for (let i = 0; i < termSets.length; i++) {
      for (let j = 0; j < termSets.length; j++) {
        if (i === j) continue;
        const t1 = termSets[i];
        const t2 = termSets[j];

        // Find opposing literal between t1 and t2
        for (const varName of t1.pos) {
          if (t2.neg.has(varName)) {
            // Consensus product is (t1 without varName) AND (t2 without varName')
            const consensusPos = new Set([...t1.pos, ...t2.pos]);
            consensusPos.delete(varName);
            const consensusNeg = new Set([...t1.neg, ...t2.neg]);
            consensusNeg.delete(varName);

            // Check if any third term matches this consensus
            for (let k = 0; k < termSets.length; k++) {
              if (k === i || k === j) continue;
              const t3 = termSets[k];
              const isSubset =
                Array.from(consensusPos).every(p => t3.pos.has(p)) &&
                Array.from(consensusNeg).every(n => t3.neg.has(n));
              if (isSubset) {
                consensusIndices.add(k);
              }
            }
          }
        }
      }
    }

    if (consensusIndices.size > 0) {
      const remaining = terms.filter((_, idx) => !consensusIndices.has(idx));
      return normalizeAST({ type: 'OR', children: remaining });
    }
  }

  return node;
}

function applyAdjacency(node: ASTNode): ASTNode {
  if (node.type === 'OR') {
    const terms = node.children;
    // AB + AB' -> A
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        const t1 = terms[i];
        const t2 = terms[j];
        if (t1.type === 'AND' && t2.type === 'AND' && t1.children.length === t2.children.length) {
          const lits1 = t1.children.map(c => astToString(c)).sort();
          const lits2 = t2.children.map(c => astToString(c)).sort();

          let diffCount = 0;
          let diffVar = '';
          for (let k = 0; k < lits1.length; k++) {
            if (lits1[k] !== lits2[k]) {
              diffCount++;
              if (lits1[k] === `${lits2[k]}'` || lits2[k] === `${lits1[k]}'`) {
                diffVar = lits1[k].replace("'", '');
              }
            }
          }

          if (diffCount === 1 && diffVar) {
            const commonChildren = t1.children.filter(c => {
              const str = astToString(c).replace("'", '');
              return str !== diffVar;
            });
            const mergedTerm = commonChildren.length === 1 ? commonChildren[0] : { type: 'AND' as const, children: commonChildren };
            const newChildren = terms.filter((_, idx) => idx !== i && idx !== j);
            newChildren.push(mergedTerm);
            return normalizeAST({ type: 'OR', children: newChildren });
          }
        }
      }
    }
  }

  return node;
}
