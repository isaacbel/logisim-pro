/**
 * Boolean Expression Lexer / Tokenizer
 * Supports flexible notations and inserts implicit AND operators.
 */

export type TokenType =
  | 'VAR'
  | 'CONST'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'NAND'
  | 'NOR'
  | 'XNOR'
  | 'NOT_PRE'     // prefix NOT: !, ~, ¬
  | 'NOT_POST'    // postfix NOT: '
  | 'LPAREN'      // (
  | 'RPAREN'      // )
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export function tokenize(input: string): Token[] {
  const rawTokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Numbers (0 or 1)
    if (ch === '0' || ch === '1') {
      rawTokens.push({ type: 'CONST', value: ch, pos: i });
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      rawTokens.push({ type: 'LPAREN', value: '(', pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      rawTokens.push({ type: 'RPAREN', value: ')', pos: i });
      i++;
      continue;
    }

    // Postfix NOT (apostrophes, primes)
    if (ch === "'" || ch === '’' || ch === '`') {
      rawTokens.push({ type: 'NOT_POST', value: "'", pos: i });
      i++;
      continue;
    }

    // Prefix NOT (!, ~, ¬)
    if (ch === '!' || ch === '~' || ch === '¬') {
      rawTokens.push({ type: 'NOT_PRE', value: '!', pos: i });
      i++;
      continue;
    }

    // AND operators (. , * , & , ·)
    if (ch === '.' || ch === '*' || ch === '&' || ch === '·' || ch === '∧') {
      rawTokens.push({ type: 'AND', value: '·', pos: i });
      i++;
      continue;
    }

    // OR operators (+ , | , ∨)
    if (ch === '+' || ch === '|' || ch === '∨') {
      rawTokens.push({ type: 'OR', value: '+', pos: i });
      i++;
      continue;
    }

    // XOR operators (^ , ⊕)
    if (ch === '^' || ch === '⊕') {
      rawTokens.push({ type: 'XOR', value: '⊕', pos: i });
      i++;
      continue;
    }

    // Word tokens: NAND, NOR, XNOR, NOT, AND, OR, XOR or Variable names
    if (/[a-zA-Z_]/.test(ch)) {
      let word = '';
      const startPos = i;
      while (i < len && /[a-zA-Z0-9_]/.test(input[i])) {
        word += input[i];
        i++;
      }

      const upper = word.toUpperCase();
      if (upper === 'AND') {
        rawTokens.push({ type: 'AND', value: 'AND', pos: startPos });
      } else if (upper === 'OR') {
        rawTokens.push({ type: 'OR', value: 'OR', pos: startPos });
      } else if (upper === 'XOR') {
        rawTokens.push({ type: 'XOR', value: 'XOR', pos: startPos });
      } else if (upper === 'NAND') {
        rawTokens.push({ type: 'NAND', value: 'NAND', pos: startPos });
      } else if (upper === 'NOR') {
        rawTokens.push({ type: 'NOR', value: 'NOR', pos: startPos });
      } else if (upper === 'XNOR') {
        rawTokens.push({ type: 'XNOR', value: 'XNOR', pos: startPos });
      } else if (upper === 'NOT') {
        rawTokens.push({ type: 'NOT_PRE', value: 'NOT', pos: startPos });
      } else {
        // Multi-letter variable (e.g. A, B, IN1) or single letters if typed sequentially (e.g. "AB")
        // If word is length > 1 and consists only of single letters like "ABC", split into individual variables
        // unless it looks like an indexed identifier (e.g. "A0", "IN_1")
        if (/^[A-Za-z]{2,}$/.test(word)) {
          for (let k = 0; k < word.length; k++) {
            rawTokens.push({ type: 'VAR', value: word[k].toUpperCase(), pos: startPos + k });
          }
        } else {
          rawTokens.push({ type: 'VAR', value: upper, pos: startPos });
        }
      }
      continue;
    }

    // Unrecognized character
    throw new Error(`Caractère inattendu à la position ${i + 1}: '${ch}'`);
  }

  // ── Insert Implicit AND Operators ─────────────────────────────────────────
  // An implicit AND is needed between:
  // - (VAR | CONST | RPAREN | NOT_POST) AND (VAR | CONST | LPAREN | NOT_PRE)
  const tokensWithImplicitAnd: Token[] = [];
  for (let idx = 0; idx < rawTokens.length; idx++) {
    const curr = rawTokens[idx];
    tokensWithImplicitAnd.push(curr);

    if (idx < rawTokens.length - 1) {
      const next = rawTokens[idx + 1];
      const currCanEndPrimary =
        curr.type === 'VAR' ||
        curr.type === 'CONST' ||
        curr.type === 'RPAREN' ||
        curr.type === 'NOT_POST';

      const nextCanStartPrimary =
        next.type === 'VAR' ||
        next.type === 'CONST' ||
        next.type === 'LPAREN' ||
        next.type === 'NOT_PRE';

      if (currCanEndPrimary && nextCanStartPrimary) {
        tokensWithImplicitAnd.push({
          type: 'AND',
          value: '·',
          pos: curr.pos,
        });
      }
    }
  }

  tokensWithImplicitAnd.push({ type: 'EOF', value: '', pos: len });
  return tokensWithImplicitAnd;
}
