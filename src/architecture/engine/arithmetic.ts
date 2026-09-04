// ─────────────────────────────────────────────────────────────────────────────
// Architecture Engine — Binary Arithmetic
// ─────────────────────────────────────────────────────────────────────────────
import type { CalculationResult, CalculationStep } from './types';

function padToBits(bin: string, bits: number): string {
  return bin.padStart(bits, '0').slice(-bits);
}

// ── Binary Addition ───────────────────────────────────────────────────────────

export interface AdditionResult {
  sum: string;
  carry: string[];
  overflow: boolean;
  decimalA: number;
  decimalB: number;
  decimalResult: number;
}

export function binaryAdd(aStr: string, bStr: string, bits: number): CalculationResult<AdditionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const a = padToBits(aStr.replace(/[^01]/g, ''), bits);
  const b = padToBits(bStr.replace(/[^01]/g, ''), bits);

  const decA = parseInt(a, 2);
  const decB = parseInt(b, 2);

  steps.push({
    title: 'Operands',
    description: `A = ${a} (${decA}₁₀), B = ${b} (${decB}₁₀)`,
    value: `${a} + ${b}`,
  });

  const carries: number[] = new Array(bits + 1).fill(0);
  const sumBits: number[] = new Array(bits).fill(0);

  for (let i = bits - 1; i >= 0; i--) {
    const bitA = parseInt(a[i]);
    const bitB = parseInt(b[i]);
    const cin = carries[i + 1];
    const total = bitA + bitB + cin;
    sumBits[i] = total % 2;
    carries[i] = Math.floor(total / 2);

    steps.push({
      title: `Column ${bits - 1 - i} (bit ${bits - 1 - i})`,
      description: `A[${i}]=${bitA} + B[${i}]=${bitB} + Carry=${cin} = ${total} → sum bit=${total % 2}, carry out=${Math.floor(total / 2)}`,
      value: (total % 2).toString(),
      details: { 'A bit': bitA, 'B bit': bitB, 'Carry in': cin, 'Sum bit': total % 2, 'Carry out': Math.floor(total / 2) },
    });
  }

  const finalCarry = carries[0];
  const sumStr = sumBits.join('');
  const decResult = parseInt(sumStr, 2) + (finalCarry ? Math.pow(2, bits) : 0);
  const overflow = finalCarry === 1;

  if (overflow) {
    warnings.push(`Overflow: result ${decResult} exceeds ${bits}-bit unsigned maximum (${Math.pow(2, bits) - 1}).`);
  }

  steps.push({
    title: overflow ? '⚠ Overflow Detected' : '✓ Result',
    description: `Sum: ${finalCarry ? '1' : ''}${sumStr} = ${decResult}₁₀${overflow ? ' (overflow!)' : ''}`,
    value: `${finalCarry ? '1' : ''}${sumStr}`,
    highlight: { type: overflow ? 'carry' : 'result' },
  });

  return {
    result: { sum: sumStr, carry: carries.map(String), overflow, decimalA: decA, decimalB: decB, decimalResult: decResult },
    steps,
    warnings,
    errors,
  };
}

// ── Binary Multiplication (partial products) ──────────────────────────────────

export interface MultiplicationResult {
  product: string;
  partialProducts: string[];
  decimalA: number;
  decimalB: number;
  decimalResult: number;
  overflow: boolean;
}

export function binaryMultiply(aStr: string, bStr: string, bits: number): CalculationResult<MultiplicationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const a = padToBits(aStr.replace(/[^01]/g, ''), bits);
  const b = padToBits(bStr.replace(/[^01]/g, ''), bits);
  const decA = parseInt(a, 2);
  const decB = parseInt(b, 2);

  steps.push({
    title: 'Operands',
    description: `A = ${a} (${decA}₁₀), B = ${b} (${decB}₁₀)`,
    value: `${a} × ${b}`,
  });

  const partialProducts: bigint[] = [];
  const partialProductStrings: string[] = [];
  let sum = BigInt(0);

  for (let i = bits - 1; i >= 0; i--) {
    const bitB = parseInt(b[i]);
    const shift = bits - 1 - i;
    const partial = bitB === 1 ? (BigInt(decA) << BigInt(shift)) : BigInt(0);
    partialProducts.push(partial);
    const partialStr = partial.toString(2).padStart(bits * 2, '0');
    partialProductStrings.push(partialStr);
    sum += partial;

    steps.push({
      title: `Partial Product for B[${i}]=${bitB}`,
      description: bitB === 1
        ? `B bit ${shift} is 1 → shift A left by ${shift}: ${partialStr}`
        : `B bit ${shift} is 0 → partial product is 0`,
      value: partialStr,
      details: { 'B bit': bitB, 'Shift': shift, 'Partial product': partialStr },
    });
  }

  const productBits = bits * 2;
  const productStr = sum.toString(2).padStart(productBits, '0').slice(-productBits);
  const decResult = Number(sum);
  const maxResult = Math.pow(2, productBits) - 1;
  const overflow = decResult > maxResult;

  steps.push({
    title: 'Sum All Partial Products',
    description: `${decA} × ${decB} = ${decResult}₁₀ = ${productStr}₂`,
    value: productStr,
    highlight: { type: 'result' },
  });

  if (overflow) warnings.push(`Result exceeds ${productBits}-bit range.`);

  return {
    result: { product: productStr, partialProducts: partialProductStrings, decimalA: decA, decimalB: decB, decimalResult: decResult, overflow },
    steps,
    warnings,
    errors,
  };
}

// ── Binary Division (restoring division) ──────────────────────────────────────

export interface DivisionResult {
  quotient: string;
  remainder: string;
  decimalA: number;
  decimalB: number;
  decimalQuotient: number;
  decimalRemainder: number;
}

export function binaryDivide(aStr: string, bStr: string, bits: number): CalculationResult<DivisionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const a = padToBits(aStr.replace(/[^01]/g, ''), bits);
  const b = padToBits(bStr.replace(/[^01]/g, ''), bits);
  const decA = parseInt(a, 2);
  const decB = parseInt(b, 2);

  if (decB === 0) {
    return {
      result: { quotient: '', remainder: '', decimalA: decA, decimalB: 0, decimalQuotient: 0, decimalRemainder: 0 },
      steps,
      warnings,
      errors: ['Division by zero is undefined.'],
    };
  }

  steps.push({
    title: 'Operands',
    description: `Dividend A = ${a} (${decA}₁₀), Divisor B = ${b} (${decB}₁₀)`,
    value: `${a} ÷ ${b}`,
  });

  // Simple restoring division
  let remainder = 0;
  const quotientBits: number[] = [];

  steps.push({ title: 'Restoring Division (MSB first)', description: 'Process each bit of dividend from MSB to LSB.' });

  for (let i = 0; i < bits; i++) {
    remainder = (remainder << 1) | parseInt(a[i]);
    const qBit = remainder >= decB ? 1 : 0;
    if (qBit === 1) remainder -= decB;
    quotientBits.push(qBit);

    steps.push({
      title: `Step ${i + 1}: bit[${bits - 1 - i}]`,
      description: `Shift in bit ${a[i]} → partial remainder = ${remainder + (qBit === 1 ? decB : 0)}, quotient bit = ${qBit}, new remainder = ${remainder}`,
      value: qBit.toString(),
      details: { 'Bit brought down': a[i], 'Quotient bit': qBit, 'Remainder': remainder },
    });
  }

  const quotientStr = quotientBits.join('').padStart(bits, '0');
  const remainderStr = remainder.toString(2).padStart(bits, '0');

  steps.push({
    title: 'Result',
    description: `${decA} ÷ ${decB} = quotient ${parseInt(quotientStr, 2)}₁₀ (${quotientStr}₂), remainder ${remainder}₁₀ (${remainderStr}₂)`,
    value: quotientStr,
    highlight: { type: 'result' },
  });

  return {
    result: { quotient: quotientStr, remainder: remainderStr, decimalA: decA, decimalB: decB, decimalQuotient: parseInt(quotientStr, 2), decimalRemainder: remainder },
    steps,
    warnings,
    errors,
  };
}

// ── Overflow Analysis ─────────────────────────────────────────────────────────

export interface OverflowAnalysis {
  bits: number;
  unsignedMax: number;
  signedMin: number;
  signedMax: number;
  unsignedOverflow: boolean;
  signedOverflow: boolean;
}

export function analyzeOverflow(value: number, bits: number): CalculationResult<OverflowAnalysis> {
  const steps: CalculationStep[] = [];
  const unsignedMax = Math.pow(2, bits) - 1;
  const signedMax = Math.pow(2, bits - 1) - 1;
  const signedMin = -Math.pow(2, bits - 1);
  const unsignedOverflow = value < 0 || value > unsignedMax;
  const signedOverflow = value < signedMin || value > signedMax;

  steps.push({
    title: `${bits}-Bit Ranges`,
    description: `Unsigned: 0 to ${unsignedMax} | Signed: ${signedMin} to ${signedMax}`,
    details: { 'Unsigned max': unsignedMax, 'Signed min': signedMin, 'Signed max': signedMax },
  });

  steps.push({
    title: 'Overflow Check',
    description: unsignedOverflow
      ? `Value ${value} exceeds unsigned range [0, ${unsignedMax}] → OVERFLOW`
      : `Value ${value} is within unsigned range [0, ${unsignedMax}] ✓`,
    value: unsignedOverflow ? 'OVERFLOW' : 'OK',
    highlight: unsignedOverflow ? { type: 'carry' } : undefined,
  });

  steps.push({
    title: 'Signed Overflow Check',
    description: signedOverflow
      ? `Value ${value} exceeds signed range [${signedMin}, ${signedMax}] → SIGNED OVERFLOW`
      : `Value ${value} is within signed range [${signedMin}, ${signedMax}] ✓`,
    value: signedOverflow ? 'SIGNED OVERFLOW' : 'OK',
    highlight: signedOverflow ? { type: 'carry' } : undefined,
  });

  return {
    result: { bits, unsignedMax, signedMin, signedMax, unsignedOverflow, signedOverflow },
    steps,
    warnings: unsignedOverflow ? [`Unsigned overflow for ${bits} bits`] : [],
    errors: [],
  };
}
