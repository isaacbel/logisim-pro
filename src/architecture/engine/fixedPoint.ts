// ─────────────────────────────────────────────────────────────────────────────
// Architecture Engine — Fixed-Point Representation
// ─────────────────────────────────────────────────────────────────────────────
import type { CalculationResult, CalculationStep } from './types';

export interface FixedPointResult {
  intBinary: string;
  fracBinary: string;
  fullBinary: string;
  intBits: number;
  fracBits: number;
  precision: number;
  truncated: boolean;
}

export function decimalToFixedPoint(
  decStr: string,
  intBits: number,
  fracBits: number
): CalculationResult<FixedPointResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const value = parseFloat(decStr);
  if (isNaN(value)) {
    return { result: { intBinary: '', fracBinary: '', fullBinary: '', intBits, fracBits, precision: fracBits, truncated: false }, steps, warnings, errors: [`"${decStr}" is not a valid number.`] };
  }

  const maxInt = Math.pow(2, intBits) - 1;
  if (Math.abs(value) > maxInt + (1 - Math.pow(2, -fracBits))) {
    warnings.push(`Value ${value} may overflow ${intBits}.${fracBits} fixed-point range.`);
  }

  const intPart = Math.trunc(value);
  const fracPart = Math.abs(value - intPart);

  // Integer part → binary
  const intBin = Math.abs(intPart).toString(2).padStart(intBits, '0').slice(-intBits);
  steps.push({
    title: 'Integer Part',
    description: `Integer part: ${intPart} → ${intBin}₂ (${intBits} bits)`,
    value: intBin,
  });

  // Fractional part → binary via repeated multiplication by 2
  steps.push({
    title: 'Fractional Part — Repeated Multiplication by 2',
    description: `Start with fraction: ${fracPart.toFixed(8)}`,
  });

  let frac = fracPart;
  const fracBitsResult: number[] = [];
  let truncated = false;

  for (let i = 0; i < fracBits; i++) {
    frac *= 2;
    const bit = frac >= 1 ? 1 : 0;
    if (bit) frac -= 1;
    fracBitsResult.push(bit);
    steps.push({
      title: `Fraction step ${i + 1}`,
      description: `${(frac + bit - (bit ? 0 : 0)).toFixed(8)} × 2 = ${(frac + (bit ? 1 : 0)).toFixed(8)} → bit = ${bit}, remaining = ${frac.toFixed(8)}`,
      value: bit.toString(),
      details: { 'Bit extracted': bit, 'Remaining fraction': frac.toFixed(8) },
    });
    if (i === fracBits - 1 && frac > 0) truncated = true;
  }

  const fracBin = fracBitsResult.join('');
  steps.push({
    title: 'Fractional Binary',
    description: `Fractional bits: .${fracBin}₂ (${fracBits} bits)`,
    value: fracBin,
  });

  const fullBinary = `${intBin}.${fracBin}`;
  steps.push({
    title: 'Full Fixed-Point Representation',
    description: `${value} ≈ ${fullBinary}₂ (${intBits} integer bits + ${fracBits} fractional bits)`,
    value: fullBinary,
    highlight: { type: 'result' },
  });

  if (truncated) warnings.push(`Fractional part truncated at ${fracBits} bits — precision loss.`);

  return {
    result: { intBinary: intBin, fracBinary: fracBin, fullBinary, intBits, fracBits, precision: fracBits, truncated },
    steps,
    warnings,
    errors,
  };
}

export function fixedPointToDecimal(
  intBin: string,
  fracBin: string
): CalculationResult<number> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  if (!/^[01]*$/.test(intBin) || !/^[01]*$/.test(fracBin)) {
    return { result: 0, steps, warnings, errors: ['Only binary digits (0,1) are allowed.'] };
  }

  const intValue = parseInt(intBin || '0', 2);
  steps.push({
    title: 'Integer Part',
    description: `${intBin}₂ = ${intValue}₁₀`,
    value: intValue.toString(),
  });

  let fracValue = 0;
  steps.push({
    title: 'Fractional Part',
    description: `Each bit multiplied by its negative power of 2`,
  });

  fracBin.split('').forEach((bit, i) => {
    const contribution = parseInt(bit) * Math.pow(2, -(i + 1));
    fracValue += contribution;
    steps.push({
      title: `Bit ${i + 1} after decimal`,
      description: `${bit} × 2^−${i + 1} = ${bit} × ${Math.pow(2, -(i + 1)).toFixed(8)} = ${contribution.toFixed(8)}`,
      value: contribution.toFixed(8),
    });
  });

  const result = intValue + fracValue;
  steps.push({
    title: 'Sum Integer + Fractional',
    description: `${intValue} + ${fracValue.toFixed(8)} = ${result}`,
    value: result.toString(),
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}
