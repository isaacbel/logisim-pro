/**
 * Boolean Function Classifier
 * Detects mathematical properties of Boolean functions from their truth tables.
 * All analyses are purely mathematical — no UI dependencies.
 */

export interface FunctionProperties {
  isConstant0: boolean;
  isConstant1: boolean;
  isIdentityVar: string | null;     // e.g. "A" if F = A
  isSelfDual: boolean;
  isSymmetric: boolean;
  isParityOdd: boolean;             // F = XOR of all variables (odd parity)
  isParityEven: boolean;            // F = XNOR of all variables (even parity)
  isMonotonic: boolean;             // F(0→1) never causes F(1→0) for any input
  isUnatePer: Record<string, 'positive' | 'negative' | 'binate'>; // per-variable unateness
  isBinate: boolean;                // at least one variable is binate (both polarities matter)
  isBalanced: boolean;              // exactly 2^(n-1) minterms
  description: string;              // French human-readable summary
}

/**
 * Classify a Boolean function based on its truth table.
 * @param minterms   - indices where F=1
 * @param variables  - variable names (alphabetically ordered)
 * @returns FunctionProperties
 */
export function classifyBooleanFunction(
  minterms: number[],
  variables: string[]
): FunctionProperties {
  const n = variables.length;
  const total = 1 << n;
  const mintermSet = new Set(minterms);

  // ── Constant checks ────────────────────────────────────────────────────────
  const isConstant0 = minterms.length === 0;
  const isConstant1 = minterms.length === total;

  // ── Identity check: F = Xi for some i ─────────────────────────────────────
  let isIdentityVar: string | null = null;
  for (let v = 0; v < n; v++) {
    const expected = new Set<number>();
    for (let m = 0; m < total; m++) {
      const bit = (m >> (n - 1 - v)) & 1;
      if (bit === 1) expected.add(m);
    }
    const match = minterms.length === expected.size && minterms.every(m => expected.has(m));
    if (match) {
      isIdentityVar = variables[v];
      break;
    }
  }

  // ── Self-dual check: F(x) = !F(!x) for all x ──────────────────────────────
  let isSelfDual = !isConstant0 && !isConstant1;
  if (isSelfDual) {
    for (let m = 0; m < total; m++) {
      const complement = total - 1 - m;
      const fM = mintermSet.has(m);
      const fComp = mintermSet.has(complement);
      if (fM === fComp) { // both same means not self-dual (should be complementary)
        isSelfDual = false;
        break;
      }
    }
  }

  // ── Symmetric check: F depends only on count of 1s among inputs ───────────
  // For each possible hamming weight k, all minterms with k ones must have same F value
  let isSymmetric = true;
  const hammingGroups = new Map<number, boolean>();
  for (let m = 0; m < total; m++) {
    const hw = countOnes(m, n);
    const fVal = mintermSet.has(m);
    if (hammingGroups.has(hw)) {
      if (hammingGroups.get(hw) !== fVal) {
        isSymmetric = false;
        break;
      }
    } else {
      hammingGroups.set(hw, fVal);
    }
  }

  // ── Parity checks ──────────────────────────────────────────────────────────
  // Odd parity: F = XOR(A,B,...) — F=1 iff odd number of 1s in input
  const isParityOdd = minterms.length > 0 &&
    minterms.every(m => countOnes(m, n) % 2 === 1) &&
    minterms.length === total / 2;

  // Even parity: F = XNOR(A,B,...) — F=1 iff even number of 1s in input
  const isParityEven = minterms.length > 0 &&
    minterms.every(m => countOnes(m, n) % 2 === 0) &&
    minterms.length === total / 2;

  // ── Monotonic check: 0→1 transition on any single variable never causes F 1→0 ──
  let isMonotonic = true;
  outer: for (let m = 0; m < total; m++) {
    for (let v = 0; v < n; v++) {
      const bit = (m >> (n - 1 - v)) & 1;
      if (bit === 0) {
        const mWith1 = m | (1 << (n - 1 - v));
        if (mintermSet.has(m) && !mintermSet.has(mWith1)) {
          isMonotonic = false;
          break outer;
        }
      }
    }
  }

  // ── Unateness analysis per variable ───────────────────────────────────────
  const isUnatePer: Record<string, 'positive' | 'negative' | 'binate'> = {};
  for (let v = 0; v < n; v++) {
    let canBePositiveUnate = true;
    let canBeNegativeUnate = true;
    const mask = 1 << (n - 1 - v);

    for (let m = 0; m < total; m++) {
      if ((m & mask) === 0) {
        // m has xi=0, mWith1 has xi=1
        const mWith1 = m | mask;
        const f0 = mintermSet.has(m) ? 1 : 0;
        const f1 = mintermSet.has(mWith1) ? 1 : 0;
        if (f0 > f1) canBePositiveUnate = false; // 1→0 transition breaks positive unateness
        if (f1 > f0) canBeNegativeUnate = false; // 0→1 transition breaks negative unateness
      }
    }

    isUnatePer[variables[v]] = canBePositiveUnate ? 'positive'
      : canBeNegativeUnate ? 'negative'
      : 'binate';
  }

  const isBinate = Object.values(isUnatePer).some(u => u === 'binate');

  // ── Balanced check: exactly half minterms ─────────────────────────────────
  const isBalanced = n > 0 && minterms.length === total / 2;

  // ── Build human-readable description ──────────────────────────────────────
  const props: string[] = [];
  if (isConstant0) props.push('Contradiction (F ≡ 0)');
  else if (isConstant1) props.push('Tautologie (F ≡ 1)');
  else {
    if (isIdentityVar) props.push(`Identité (F = ${isIdentityVar})`);
    if (isSelfDual) props.push('Auto-duale (F(x) = ¬F(¬x))');
    if (isSymmetric) props.push('Symétrique');
    if (isParityOdd) props.push('Parité impaire (F = XOR)');
    if (isParityEven) props.push('Parité paire (F = XNOR)');
    if (isMonotonic) props.push('Monotone croissante');
    if (isBinate) props.push('Binate (variable bi-polaire)');
    else props.push('Unate');
    if (isBalanced) props.push('Équilibrée (2^(n-1) mintermes)');
  }

  return {
    isConstant0,
    isConstant1,
    isIdentityVar,
    isSelfDual,
    isSymmetric,
    isParityOdd,
    isParityEven,
    isMonotonic,
    isUnatePer,
    isBinate,
    isBalanced,
    description: props.join(' · ') || 'Fonction booléenne générale',
  };
}

function countOnes(n: number, bits: number): number {
  let count = 0;
  for (let i = 0; i < bits; i++) {
    if ((n >> i) & 1) count++;
  }
  return count;
}
