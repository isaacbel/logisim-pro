/**
 * Recursive Descent Boolean Expression Parser
 * Strictly enforces precedence:
 * (1) Parentheses ()
 * (2) NOT (prefix !, ~, ¬ or postfix ')
 * (3) AND / NAND
 * (4) XOR / XNOR
 * (5) OR / NOR
 */

import { Token, TokenType, tokenize } from './tokenizer';
import {
  ASTNode,
  createVar,
  createConst,
  createNot,
  createAnd,
  createOr,
  createXor,
  createNand,
  createNor,
  createXnor,
} from './ast';

export class BooleanParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  static parse(input: string): ASTNode {
    const cleaned = input.trim();
    if (!cleaned) {
      throw new Error("L'expression booléenne ne peut pas être vide.");
    }
    // Clean optional prefix like "F = " or "f(A,B,C) = "
    const withoutPrefix = cleaned.replace(/^[A-Za-z]\s*(\([^)]*\))?\s*=\s*/, '');
    const tokens = tokenize(withoutPrefix);
    const parser = new BooleanParser(tokens);
    const ast = parser.parseExpression();

    if (!parser.isAtEnd()) {
      const remaining = parser.peek();
      throw new Error(`Erreur de syntaxe : token inattendu '${remaining.value}' à la position ${remaining.pos + 1}.`);
    }

    return ast;
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current] ?? { type: 'EOF', value: '', pos: -1 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(`${message} (obtenu '${token.value || 'fin'}' à la position ${token.pos + 1})`);
  }

  // ── Grammar Rules ─────────────────────────────────────────────────────────

  /**
   * expression -> orExpr
   */
  private parseExpression(): ASTNode {
    return this.parseOr();
  }

  /**
   * orExpr -> xorExpr ( ( "OR" | "NOR" ) xorExpr )*
   */
  private parseOr(): ASTNode {
    let expr = this.parseXor();

    while (this.match('OR', 'NOR')) {
      const op = this.previous().type;
      const right = this.parseXor();
      if (op === 'NOR') {
        expr = createNor([expr, right]);
      } else {
        // Flatten OR if expr is already OR
        if (expr.type === 'OR') {
          expr = createOr([...expr.children, right]);
        } else {
          expr = createOr([expr, right]);
        }
      }
    }

    return expr;
  }

  /**
   * xorExpr -> andExpr ( ( "XOR" | "XNOR" ) andExpr )*
   */
  private parseXor(): ASTNode {
    let expr = this.parseAnd();

    while (this.match('XOR', 'XNOR')) {
      const op = this.previous().type;
      const right = this.parseAnd();
      if (op === 'XNOR') {
        expr = createXnor([expr, right]);
      } else {
        if (expr.type === 'XOR') {
          expr = createXor([...expr.children, right]);
        } else {
          expr = createXor([expr, right]);
        }
      }
    }

    return expr;
  }

  /**
   * andExpr -> unary ( ( "AND" | "NAND" ) unary )*
   */
  private parseAnd(): ASTNode {
    let expr = this.parseUnary();

    while (this.match('AND', 'NAND')) {
      const op = this.previous().type;
      const right = this.parseUnary();
      if (op === 'NAND') {
        expr = createNand([expr, right]);
      } else {
        // Flatten AND if expr is already AND
        if (expr.type === 'AND') {
          expr = createAnd([...expr.children, right]);
        } else {
          expr = createAnd([expr, right]);
        }
      }
    }

    return expr;
  }

  /**
   * unary -> NOT_PRE unary | postfix
   */
  private parseUnary(): ASTNode {
    if (this.match('NOT_PRE')) {
      const operand = this.parseUnary();
      return createNot(operand);
    }
    return this.parsePostfix();
  }

  /**
   * postfix -> primary ( NOT_POST )*
   */
  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();

    while (this.match('NOT_POST')) {
      expr = createNot(expr);
    }

    return expr;
  }

  /**
   * primary -> VAR | CONST | "(" expression ")"
   */
  private parsePrimary(): ASTNode {
    if (this.match('CONST')) {
      const val = parseInt(this.previous().value, 10) as 0 | 1;
      return createConst(val);
    }

    if (this.match('VAR')) {
      return createVar(this.previous().value);
    }

    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', "Parenthèse fermante ')' manquante après l'expression.");
      return expr;
    }

    const unexpected = this.peek();
    throw new Error(`Expression invalide à la position ${unexpected.pos + 1}: attendu variable, constante ou '('.`);
  }
}

export function parseBooleanExpression(input: string): ASTNode {
  return BooleanParser.parse(input);
}
