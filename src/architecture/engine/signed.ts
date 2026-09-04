// ─────────────────────────────────────────────────────────────────────────────
// Architecture Engine — Signed Number Representations
// ─────────────────────────────────────────────────────────────────────────────
import type { CalculationResult, CalculationStep } from './types';

function padBits(bin: string, n: number): string {
  return bin.padStart(n, '0').slice(-n);
}

// ── Sign-Magnitude ────────────────────────────────────────────────────────────

export function toSignMagnitude(value: number, bits: number): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  if (bits < 2) return { result: '', steps, warnings, errors: ['Minimum 2 bits required.'] };

  const magBits = bits - 1;
  const maxMag = Math.pow(2, magBits) - 1;

  if (Math.abs(value) > maxMag) {
    return { result: '', steps, warnings, errors: [`|${value}| = ${Math.abs(value)} exceeds ${magBits}-bit magnitude max (${maxMag}).`] };
  }

  const signBit = value < 0 ? 1 : 0;
  const magnitude = Math.abs(value);
  const magStr = magnitude.toString(2).padStart(magBits, '0');
  const result = `${signBit}${magStr}`;

  steps.push({
    title: 'Sign Bit',
    description: `${value} is ${value < 0 ? 'negative' : 'positive'} → sign bit = ${signBit}`,
    value: signBit.toString(),
    highlight: { type: 'sign', positions: [0] },
  });

  steps.push({
    title: 'Magnitude',
    description: `|${value}| = ${magnitude} = ${magStr}₂ (${magBits} bits)`,
    value: magStr,
  });

  steps.push({
    title: 'Result',
    description: `Sign-Magnitude: [${signBit}][${magStr}] = ${result}`,
    value: result,
    highlight: { type: 'result' },
  });

  if (value === 0) {
    warnings.push('Sign-magnitude has two representations of zero: +0 = 00…0 and −0 = 10…0');
  }

  return { result, steps, warnings, errors };
}

// ── One's Complement ──────────────────────────────────────────────────────────

export function toOnesComplement(value: number, bits: number): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  if (bits < 2) return { result: '', steps, warnings, errors: ['Minimum 2 bits required.'] };

  const maxPos = Math.pow(2, bits - 1) - 1;
  if (Math.abs(value) > maxPos) {
    return { result: '', steps, warnings, errors: [`${value} exceeds ${bits}-bit one's complement range [${-maxPos}, ${maxPos}].`] };
  }

  const posBin = padBits(Math.abs(value).toString(2), bits);

  steps.push({
    title: 'Magnitude Binary',
    description: `|${value}| = ${Math.abs(value)} in ${bits}-bit binary = ${posBin}`,
    value: posBin,
  });

  if (value >= 0) {
    steps.push({
      title: 'Positive Number',
      description: 'No inversion needed — positive numbers are represented normally.',
      value: posBin,
      highlight: { type: 'result' },
    });
    return { result: posBin, steps, warnings, errors };
  }

  // Invert all bits
  const inverted = posBin.split('').map(b => b === '0' ? '1' : '0').join('');

  steps.push({
    title: 'Invert All Bits',
    description: `${posBin} → invert each bit → ${inverted}`,
    value: inverted,
  });

  steps.push({
    title: 'Result (One\'s Complement)',
    description: `${value} = ${inverted}₂ in one's complement`,
    value: inverted,
    highlight: { type: 'result' },
  });

  if (value === 0) warnings.push('One\'s complement has two zeros: 00…0 (+0) and 11…1 (−0)');

  return { result: inverted, steps, warnings, errors };
}

// ── Two's Complement ──────────────────────────────────────────────────────────

export function toTwosComplement(value: number, bits: number): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  if (bits < 2) return { result: '', steps, warnings, errors: ['Minimum 2 bits required.'] };

  const maxPos = Math.pow(2, bits - 1) - 1;
  const minNeg = -Math.pow(2, bits - 1);

  if (value > maxPos || value < minNeg) {
    return { result: '', steps, warnings, errors: [`${value} is out of ${bits}-bit two's complement range [${minNeg}, ${maxPos}].`] };
  }

  const posBin = padBits(Math.abs(value).toString(2), bits);

  steps.push({
    title: 'Magnitude Binary',
    description: `|${value}| = ${Math.abs(value)} in ${bits}-bit binary = ${posBin}`,
    value: posBin,
  });

  if (value >= 0) {
    steps.push({
      title: 'Positive (no change)',
      description: 'Positive numbers use the same binary representation.',
      value: posBin,
      highlight: { type: 'result' },
    });
    return { result: posBin, steps, warnings, errors };
  }

  // Step 1: invert all bits
  const inverted = posBin.split('').map(b => b === '0' ? '1' : '0').join('');
  steps.push({
    title: 'Step 1: Invert All Bits',
    description: `${posBin} → ${inverted}`,
    value: inverted,
  });

  // Step 2: add 1
  let carry = 1;
  const resultBits = inverted.split('').map(Number);
  for (let i = resultBits.length - 1; i >= 0 && carry > 0; i--) {
    const sum = resultBits[i] + carry;
    resultBits[i] = sum % 2;
    carry = Math.floor(sum / 2);
  }
  const result = resultBits.join('');

  steps.push({
    title: 'Step 2: Add 1',
    description: `${inverted} + 1 = ${result}`,
    value: result,
  });

  steps.push({
    title: 'Result (Two\'s Complement)',
    description: `${value} = ${result}₂ in two's complement (${bits} bits)`,
    value: result,
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}

// ── Two's Complement → Decimal ────────────────────────────────────────────────

export function twosComplementToDecimal(binStr: string, bits: number): CalculationResult<number> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const padded = padBits(binStr.replace(/[^01]/g, ''), bits);

  steps.push({
    title: 'Input Binary',
    description: `${bits}-bit two's complement: ${padded}`,
    value: padded,
    highlight: { type: 'sign', positions: [0] },
  });

  const sign = parseInt(padded[0]);

  steps.push({
    title: 'Check Sign Bit',
    description: `MSB = ${sign} → number is ${sign === 0 ? 'positive' : 'negative'}`,
    value: sign.toString(),
  });

  if (sign === 0) {
    const result = parseInt(padded, 2);
    steps.push({
      title: 'Positive: direct conversion',
      description: `${padded}₂ = ${result}₁₀`,
      value: result.toString(),
      highlight: { type: 'result' },
    });
    return { result, steps, warnings, errors };
  }

  // Negative: invert + add 1 to find magnitude
  const inverted = padded.split('').map(b => b === '0' ? '1' : '0').join('');
  steps.push({ title: 'Invert All Bits', description: `${padded} → ${inverted}`, value: inverted });

  let carry = 1;
  const magBits = inverted.split('').map(Number);
  for (let i = magBits.length - 1; i >= 0 && carry > 0; i--) {
    const sum = magBits[i] + carry;
    magBits[i] = sum % 2;
    carry = Math.floor(sum / 2);
  }
  const magStr = magBits.join('');
  const mag = parseInt(magStr, 2);

  steps.push({ title: 'Add 1 to Find Magnitude', description: `${inverted} + 1 = ${magStr} = ${mag}₁₀`, value: magStr });

  const result = -mag;
  steps.push({
    title: 'Apply Negative Sign',
    description: `Decimal value = −${mag} = ${result}`,
    value: result.toString(),
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}

// ── Two's Complement Arithmetic ───────────────────────────────────────────────

export interface SignedArithmeticResult {
  aTC: string;
  bTC: string;
  rawSum: string;
  result: string;
  decimalResult: number;
  overflow: boolean;
  carry: boolean;
}

export function twosComplementAdd(a: number, b: number, bits: number): CalculationResult<SignedArithmeticResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const maxPos = Math.pow(2, bits - 1) - 1;
  const minNeg = -Math.pow(2, bits - 1);

  if (a < minNeg || a > maxPos || b < minNeg || b > maxPos) {
    return {
      result: { aTC: '', bTC: '', rawSum: '', result: '', decimalResult: 0, overflow: false, carry: false },
      steps,
      warnings,
      errors: [`Operands must be in ${bits}-bit signed range [${minNeg}, ${maxPos}].`],
    };
  }

  const aTC = toTwosComplement(a, bits).result;
  const bTC = toTwosComplement(b, bits).result;

  steps.push({
    title: 'Convert to Two\'s Complement',
    description: `A = ${a} → ${aTC}  |  B = ${b} → ${bTC}`,
    value: `${aTC} + ${bTC}`,
  });

  // Column-by-column addition
  let carry = 0;
  let carryIntoMSB = 0;
  const sumBits: number[] = new Array(bits).fill(0);
  for (let i = bits - 1; i >= 0; i--) {
    if (i === 0) {
      carryIntoMSB = carry;
    }
    const bitA = parseInt(aTC[i]);
    const bitB = parseInt(bTC[i]);
    const total = bitA + bitB + carry;
    sumBits[i] = total % 2;
    carry = Math.floor(total / 2);

    steps.push({
      title: `Column bit ${bits - 1 - i}`,
      description: `${bitA} + ${bitB} + carry ${i === bits - 1 ? 0 : carry} = ${total} → sum=${total % 2}`,
      value: (total % 2).toString(),
    });
  }

  const rawSum = sumBits.join('');
  const finalCarry = carry;

  // Two's complement overflow: carry into MSB !== carry out of MSB
  const overflow = (carryIntoMSB !== finalCarry);

  const decimalResult = parseInt(rawSum[0]) === 1
    ? -(Math.pow(2, bits) - parseInt(rawSum, 2))
    : parseInt(rawSum, 2);

  steps.push({
    title: overflow ? '⚠ Overflow Detected' : '✓ Result',
    description: `Raw sum: ${rawSum} = ${decimalResult}₁₀${overflow ? ' (OVERFLOW: signed range exceeded)' : ''}`,
    value: rawSum,
    highlight: { type: overflow ? 'carry' : 'result' },
  });

  if (overflow) warnings.push(`Signed overflow in ${bits}-bit two's complement arithmetic.`);

  return {
    result: { aTC, bTC, rawSum, result: rawSum, decimalResult, overflow, carry: finalCarry === 1 },
    steps,
    warnings,
    errors,
  };
}

export function twosComplementSubtract(a: number, b: number, bits: number): CalculationResult<SignedArithmeticResult> {
  const steps: CalculationStep[] = [
    {
      title: 'Subtraction → Addition of Negation',
      description: `A − B = A + (−B) = ${a} + (${-b})`,
      value: `${a} + (${-b})`,
    },
  ];
  const res = twosComplementAdd(a, -b, bits);
  return { ...res, steps: [...steps, ...res.steps] };
}
