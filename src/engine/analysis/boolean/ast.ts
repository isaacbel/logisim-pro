/**
 * Boolean Expression Abstract Syntax Tree (AST) Definition
 */

export type ASTNodeType =
  | 'VAR'
  | 'CONST'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'NAND'
  | 'NOR'
  | 'XNOR';

export interface BaseASTNode {
  readonly type: ASTNodeType;
}

export interface VarNode extends BaseASTNode {
  readonly type: 'VAR';
  readonly name: string;
}

export interface ConstNode extends BaseASTNode {
  readonly type: 'CONST';
  readonly value: 0 | 1;
}

export interface NotNode extends BaseASTNode {
  readonly type: 'NOT';
  readonly child: ASTNode;
}

export interface NaryNode extends BaseASTNode {
  readonly type: 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR';
  readonly children: ASTNode[];
}

export type ASTNode = VarNode | ConstNode | NotNode | NaryNode;

// ── Node Factory Functions ──────────────────────────────────────────────────

export const createVar = (name: string): VarNode => ({
  type: 'VAR',
  name: name.toUpperCase().trim(),
});

export const createConst = (value: 0 | 1): ConstNode => ({
  type: 'CONST',
  value,
});

export const createNot = (child: ASTNode): NotNode => ({
  type: 'NOT',
  child,
});

export const createAnd = (children: ASTNode[]): ASTNode => {
  if (children.length === 0) return createConst(1);
  if (children.length === 1) return children[0];
  return { type: 'AND', children };
};

export const createOr = (children: ASTNode[]): ASTNode => {
  if (children.length === 0) return createConst(0);
  if (children.length === 1) return children[0];
  return { type: 'OR', children };
};

export const createXor = (children: ASTNode[]): ASTNode => {
  if (children.length === 0) return createConst(0);
  if (children.length === 1) return children[0];
  return { type: 'XOR', children };
};

export const createNand = (children: ASTNode[]): ASTNode => ({
  type: 'NAND',
  children,
});

export const createNor = (children: ASTNode[]): ASTNode => ({
  type: 'NOR',
  children,
});

export const createXnor = (children: ASTNode[]): ASTNode => ({
  type: 'XNOR',
  children,
});

// ── AST Helpers ─────────────────────────────────────────────────────────────

/**
 * Extracts all unique variable names used in the AST (sorted alphabetically)
 */
export function extractVariables(node: ASTNode): string[] {
  const vars = new Set<string>();

  function walk(n: ASTNode) {
    if (n.type === 'VAR') {
      vars.add(n.name);
    } else if (n.type === 'NOT') {
      walk(n.child);
    } else if ('children' in n) {
      n.children.forEach(walk);
    }
  }

  walk(node);
  return Array.from(vars).sort();
}

/**
 * Deep clone an AST node
 */
export function cloneAST(node: ASTNode): ASTNode {
  if (node.type === 'VAR') return { type: 'VAR', name: node.name };
  if (node.type === 'CONST') return { type: 'CONST', value: node.value };
  if (node.type === 'NOT') return { type: 'NOT', child: cloneAST(node.child) };
  return {
    type: node.type,
    children: node.children.map(cloneAST),
  };
}

/**
 * Computes the maximum tree depth of an AST
 */
export function getASTDepth(node: ASTNode): number {
  if (node.type === 'VAR' || node.type === 'CONST') return 1;
  if (node.type === 'NOT') return 1 + getASTDepth(node.child);
  if ('children' in node && node.children.length > 0) {
    return 1 + Math.max(...node.children.map(getASTDepth));
  }
  return 1;
}

/**
 * Counts total literals (variable appearances) in the AST
 */
export function countLiterals(node: ASTNode): number {
  if (node.type === 'VAR') return 1;
  if (node.type === 'CONST') return 0;
  if (node.type === 'NOT') return countLiterals(node.child);
  if ('children' in node) {
    return node.children.reduce((acc, c) => acc + countLiterals(c), 0);
  }
  return 0;
}

/**
 * Counts total logic gates in the AST
 */
export function countGates(node: ASTNode): number {
  if (node.type === 'VAR' || node.type === 'CONST') return 0;
  if (node.type === 'NOT') return 1 + countGates(node.child);
  if ('children' in node) {
    return 1 + node.children.reduce((acc, c) => acc + countGates(c), 0);
  }
  return 0;
}

// ── AST String Formatter ────────────────────────────────────────────────────

export interface FormatOptions {
  andOp?: string;       // e.g. '' (implicit), '·', '.', '*'
  orOp?: string;        // e.g. ' + ', ' | '
  xorOp?: string;       // e.g. ' ⊕ ', ' ^ '
  notStyle?: 'postfix' | 'prefix' | 'overline' | 'symbol'; // 'postfix' = A', 'prefix' = !A, 'symbol' = ¬A
}

const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  andOp: '·',
  orOp: ' + ',
  xorOp: ' ⊕ ',
  notStyle: 'postfix',
};

/**
 * Converts an AST to a readable mathematical string
 */
export function astToString(node: ASTNode, options: FormatOptions = DEFAULT_FORMAT_OPTIONS): string {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };

  function format(n: ASTNode, parentPrecedence = 0): string {
    switch (n.type) {
      case 'VAR':
        return n.name;
      case 'CONST':
        return n.value.toString();
      case 'NOT': {
        const childStr = format(n.child, 4);
        if (opts.notStyle === 'postfix') {
          return n.child.type === 'VAR' ? `${childStr}'` : `(${childStr})'`;
        }
        if (opts.notStyle === 'overline') {
          return `<span style="text-decoration:overline">${childStr}</span>`;
        }
        if (opts.notStyle === 'symbol') {
          return n.child.type === 'VAR' ? `¬${childStr}` : `¬(${childStr})`;
        }
        return n.child.type === 'VAR' ? `!${childStr}` : `!(${childStr})`;
      }
      case 'AND': {
        const currentPrecedence = 3;
        const joined = n.children
          .map(c => format(c, currentPrecedence))
          .join(opts.andOp ?? '·');
        return currentPrecedence < parentPrecedence ? `(${joined})` : joined;
      }
      case 'XOR': {
        const currentPrecedence = 2;
        const joined = n.children
          .map(c => format(c, currentPrecedence))
          .join(opts.xorOp ?? ' ⊕ ');
        return currentPrecedence < parentPrecedence ? `(${joined})` : joined;
      }
      case 'OR': {
        const currentPrecedence = 1;
        const joined = n.children
          .map(c => format(c, currentPrecedence))
          .join(opts.orOp ?? ' + ');
        return currentPrecedence < parentPrecedence ? `(${joined})` : joined;
      }
      case 'NAND': {
        const joined = n.children.map(c => format(c, 3)).join(opts.andOp ?? '·');
        return `(${joined})'`;
      }
      case 'NOR': {
        const joined = n.children.map(c => format(c, 1)).join(opts.orOp ?? ' + ');
        return `(${joined})'`;
      }
      case 'XNOR': {
        const joined = n.children.map(c => format(c, 2)).join(opts.xorOp ?? ' ⊕ ');
        return `(${joined})'`;
      }
    }
  }

  return format(node, 0);
}
