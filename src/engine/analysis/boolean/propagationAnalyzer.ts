/**
 * Gate Propagation Delay & Circuit Timing Analyzer
 * Calculates gate depth, critical path, fan-in, fan-out from an AST or circuit.
 */

import { ASTNode } from './ast';
import { parseBooleanExpression } from './parser';

export interface GateLevel {
  level: number;
  nodes: string[];  // descriptions of gates at this level
}

export interface TimingAnalysisResult {
  gateDepth: number;
  logicLevels: number;
  criticalPath: string[];
  fanInMax: number;
  fanOutEstimate: number;
  levelBreakdown: GateLevel[];
  description: string;
}

/**
 * Analyzes timing and gate depth of a Boolean expression's AST.
 * The critical path is the longest sequence from input to output.
 */
export function analyzeExpressionTiming(input: ASTNode | string): TimingAnalysisResult {
  const ast: ASTNode = typeof input === 'string' ? parseBooleanExpression(input) : input;
  const levels: GateLevel[] = [];

  function buildLevels(node: ASTNode, level: number): number {
    if (node.type === 'VAR' || node.type === 'CONST') {
      return 0; // inputs are at level 0
    }

    if (node.type === 'NOT') {
      const childLevel = buildLevels(node.child, level);
      const myLevel = childLevel + 1;
      ensureLevel(levels, myLevel, `NOT`);
      return myLevel;
    }

    // N-ary node
    const childLevels = node.children.map(c => buildLevels(c, level));
    const maxChildLevel = Math.max(...childLevels, 0);
    const myLevel = maxChildLevel + 1;

    const gateLabel = node.type;
    const fanIn = node.children.length;
    ensureLevel(levels, myLevel, `${gateLabel}(${fanIn})`);
    return myLevel;
  }

  const totalDepth = buildLevels(ast, 0);

  // Estimate fan-out: how many times does each variable appear in the expression?
  const varAppearances: Record<string, number> = {};
  function countAppearances(node: ASTNode) {
    if (node.type === 'VAR') {
      varAppearances[node.name] = (varAppearances[node.name] ?? 0) + 1;
    } else if (node.type === 'NOT') {
      countAppearances(node.child);
    } else if ('children' in node) {
      node.children.forEach(countAppearances);
    }
  }
  countAppearances(ast);
  const fanOutEstimate = Math.max(...Object.values(varAppearances), 1);

  // Estimate max fan-in from AST
  let fanInMax = 1;
  function findMaxFanIn(node: ASTNode) {
    if ('children' in node) {
      fanInMax = Math.max(fanInMax, node.children.length);
      node.children.forEach(findMaxFanIn);
    } else if (node.type === 'NOT') {
      findMaxFanIn(node.child);
    }
  }
  findMaxFanIn(ast);

  // Build critical path description (simplified: uses gate types)
  const cp: string[] = ['Entrée'];
  if (hasNot(ast)) cp.push('NON');
  if (hasAndNand(ast)) cp.push('ET/NAND');
  if (hasOrNor(ast)) cp.push('OU/NOR');
  cp.push('Sortie');

  const descParts = [
    `Profondeur logique : ${totalDepth} niveau(x)`,
    `Fan-in maximum : ${fanInMax} entrées`,
    `Fan-out estimé : ${fanOutEstimate} connexion(s) par variable`,
  ];

  return {
    gateDepth: totalDepth,
    logicLevels: totalDepth,
    criticalPath: cp,
    fanInMax,
    fanOutEstimate,
    levelBreakdown: levels,
    description: descParts.join(' | '),
  };
}

/**
 * Compares timing between SOP, NAND-only, and NOR-only implementations.
 */
export function compareImplementationDepths(sopExpression: string, nandExpression: string, norExpression: string): {
  sop: number;
  nand: number;
  nor: number;
  best: 'sop' | 'nand' | 'nor';
} {
  const sopDepth = analyzeExpressionTiming(sopExpression).gateDepth;
  const nandDepth = analyzeExpressionTiming(nandExpression).gateDepth;
  const norDepth = analyzeExpressionTiming(norExpression).gateDepth;
  const minDepth = Math.min(sopDepth, nandDepth, norDepth);
  const best = sopDepth === minDepth ? 'sop' : nandDepth === minDepth ? 'nand' : 'nor';

  return { sop: sopDepth, nand: nandDepth, nor: norDepth, best };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ensureLevel(levels: GateLevel[], level: number, gate: string) {
  while (levels.length <= level) levels.push({ level: levels.length, nodes: [] });
  levels[level].nodes.push(gate);
}

function hasNot(node: ASTNode): boolean {
  if (node.type === 'NOT') return true;
  if ('children' in node) return node.children.some(hasNot);
  return false;
}

function hasAndNand(node: ASTNode): boolean {
  if (node.type === 'AND' || node.type === 'NAND') return true;
  if (node.type === 'NOT') return hasAndNand(node.child);
  if ('children' in node) return node.children.some(hasAndNand);
  return false;
}

function hasOrNor(node: ASTNode): boolean {
  if (node.type === 'OR' || node.type === 'NOR') return true;
  if (node.type === 'NOT') return hasOrNor(node.child);
  if ('children' in node) return node.children.some(hasOrNor);
  return false;
}
