/**
 * Boolean AST Normalizer
 * Flattens associative operators, removes double negations, eliminates duplicates, and folds constants.
 */

import {
  ASTNode,
  createConst,
  createNot,
  createAnd,
  createOr,
  createXor,
  astToString,
  cloneAST,
} from './ast';

export function normalizeAST(node: ASTNode): ASTNode {
  let prev = '';
  let curr = cloneAST(node);

  // Repeat until stable
  let iterations = 0;
  while (iterations < 20) {
    const serialized = astToString(curr);
    if (serialized === prev) break;
    prev = serialized;

    curr = removeDoubleNegation(curr);
    curr = flattenAssociative(curr);
    curr = foldConstants(curr);
    curr = removeDuplicates(curr);
    curr = canonicalSort(curr);
    iterations++;
  }

  return curr;
}

function removeDoubleNegation(node: ASTNode): ASTNode {
  if (node.type === 'NOT') {
    if (node.child.type === 'NOT') {
      return removeDoubleNegation(node.child.child);
    }
    return createNot(removeDoubleNegation(node.child));
  }

  if ('children' in node) {
    const updatedChildren = node.children.map(removeDoubleNegation);
    return { ...node, children: updatedChildren };
  }

  return node;
}

function flattenAssociative(node: ASTNode): ASTNode {
  if (node.type === 'AND' || node.type === 'OR' || node.type === 'XOR') {
    const flattenedChildren: ASTNode[] = [];

    for (const child of node.children) {
      const normalizedChild = flattenAssociative(child);
      if (normalizedChild.type === node.type) {
        flattenedChildren.push(...normalizedChild.children);
      } else {
        flattenedChildren.push(normalizedChild);
      }
    }

    if (node.type === 'AND') return createAnd(flattenedChildren);
    if (node.type === 'OR') return createOr(flattenedChildren);
    if (node.type === 'XOR') return createXor(flattenedChildren);
  }

  if (node.type === 'NOT') {
    return createNot(flattenAssociative(node.child));
  }

  if ('children' in node) {
    const updatedChildren = node.children.map(flattenAssociative);
    return { ...node, children: updatedChildren };
  }

  return node;
}

function foldConstants(node: ASTNode): ASTNode {
  if (node.type === 'NOT') {
    const child = foldConstants(node.child);
    if (child.type === 'CONST') {
      return createConst(child.value === 1 ? 0 : 1);
    }
    return createNot(child);
  }

  if (node.type === 'AND') {
    const children = node.children.map(foldConstants);
    // If any child is 0, AND is 0
    if (children.some(c => c.type === 'CONST' && c.value === 0)) {
      return createConst(0);
    }
    // Filter out 1s
    const filtered = children.filter(c => !(c.type === 'CONST' && c.value === 1));
    return createAnd(filtered);
  }

  if (node.type === 'OR') {
    const children = node.children.map(foldConstants);
    // If any child is 1, OR is 1
    if (children.some(c => c.type === 'CONST' && c.value === 1)) {
      return createConst(1);
    }
    // Filter out 0s
    const filtered = children.filter(c => !(c.type === 'CONST' && c.value === 0));
    return createOr(filtered);
  }

  if (node.type === 'XOR') {
    const children = node.children.map(foldConstants);
    // 0 is neutral in XOR, 1 inverts
    let inversions = 0;
    const nonConst: ASTNode[] = [];
    for (const c of children) {
      if (c.type === 'CONST') {
        if (c.value === 1) inversions++;
      } else {
        nonConst.push(c);
      }
    }
    const base = createXor(nonConst);
    return (inversions % 2 === 1) ? createNot(base) : base;
  }

  return node;
}

function removeDuplicates(node: ASTNode): ASTNode {
  if (node.type === 'AND' || node.type === 'OR') {
    const seen = new Set<string>();
    const unique: ASTNode[] = [];

    for (const child of node.children) {
      const childNorm = removeDuplicates(child);
      const str = astToString(childNorm);
      if (!seen.has(str)) {
        seen.add(str);
        unique.push(childNorm);
      }
    }

    // Check for complement contradiction: A and A' in AND -> 0, A or A' in OR -> 1
    if (node.type === 'AND') {
      const literals = new Set<string>();
      const negatedLiterals = new Set<string>();
      for (const u of unique) {
        if (u.type === 'VAR') literals.add(u.name);
        if (u.type === 'NOT' && u.child.type === 'VAR') negatedLiterals.add(u.child.name);
      }
      for (const lit of literals) {
        if (negatedLiterals.has(lit)) return createConst(0);
      }
      return createAnd(unique);
    }

    if (node.type === 'OR') {
      const literals = new Set<string>();
      const negatedLiterals = new Set<string>();
      for (const u of unique) {
        if (u.type === 'VAR') literals.add(u.name);
        if (u.type === 'NOT' && u.child.type === 'VAR') negatedLiterals.add(u.child.name);
      }
      for (const lit of literals) {
        if (negatedLiterals.has(lit)) return createConst(1);
      }
      return createOr(unique);
    }
  }

  if (node.type === 'NOT') {
    return createNot(removeDuplicates(node.child));
  }

  if ('children' in node) {
    return { ...node, children: node.children.map(removeDuplicates) };
  }

  return node;
}

function canonicalSort(node: ASTNode): ASTNode {
  if (node.type === 'AND' || node.type === 'OR' || node.type === 'XOR') {
    const sorted = [...node.children.map(canonicalSort)].sort((a, b) =>
      astToString(a).localeCompare(astToString(b))
    );
    if (node.type === 'AND') return createAnd(sorted);
    if (node.type === 'OR') return createOr(sorted);
    return createXor(sorted);
  }

  if (node.type === 'NOT') {
    return createNot(canonicalSort(node.child));
  }

  if ('children' in node) {
    return { ...node, children: node.children.map(canonicalSort) };
  }

  return node;
}
