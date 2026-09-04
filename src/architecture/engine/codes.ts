// ─────────────────────────────────────────────────────────────────────────────
// Architecture Engine — Special Codes: BCD and Excess-3
// ─────────────────────────────────────────────────────────────────────────────
import type { CalculationResult, CalculationStep } from './types';

// ── BCD Encoding ──────────────────────────────────────────────────────────────

export interface BCDResult {
  digits: number[];
  bcdGroups: string[];
  fullBCD: string;
}

export function decimalToBCD(decStr: string): CalculationResult<BCDResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const trimmed = decStr.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { result: { digits: [], bcdGroups: [], fullBCD: '' }, steps, warnings, errors: [`"${trimmed}" is not a valid non-negative integer.`] };
  }

  steps.push({
    title: 'BCD Encoding',
    description: 'Each decimal digit is encoded as a 4-bit binary group.',
  });

  const digits = trimmed.split('').map(Number);
  const bcdGroups: string[] = [];

  digits.forEach((d, i) => {
    const group = d.toString(2).padStart(4, '0');
    bcdGroups.push(group);
    steps.push({
      title: `Digit ${i + 1}: ${d}`,
      description: `${d}₁₀ → ${group}₂ (4 bits)`,
      value: group,
      details: { Digit: d, 'BCD Group': group },
    });
  });

  const fullBCD = bcdGroups.join(' ');
  steps.push({
    title: 'Result',
    description: `BCD for ${decStr}: ${fullBCD}`,
    value: fullBCD,
    highlight: { type: 'result' },
  });

  return { result: { digits, bcdGroups, fullBCD }, steps, warnings, errors };
}

// ── BCD Addition ──────────────────────────────────────────────────────────────

export interface BCDAddResult {
  aDigits: number[];
  bDigits: number[];
  digitResults: { sum: number; raw: string; needsCorrection: boolean; corrected: string; carry: number }[];
  finalBCD: string;
  decimalResult: number;
}

export function bcdAdd(aStr: string, bStr: string): CalculationResult<BCDAddResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  if (!/^\d+$/.test(aStr.trim()) || !/^\d+$/.test(bStr.trim())) {
    return { result: { aDigits: [], bDigits: [], digitResults: [], finalBCD: '', decimalResult: 0 }, steps, warnings, errors: ['Both operands must be non-negative decimal integers.'] };
  }

  const a = aStr.trim();
  const b = bStr.trim();
  const maxLen = Math.max(a.length, b.length) + 1;
  const aPad = a.padStart(maxLen, '0');
  const bPad = b.padStart(maxLen, '0');

  steps.push({
    title: 'BCD Addition',
    description: `Adding ${a} + ${b} in BCD, digit by digit from right to left.`,
  });

  let carry = 0;
  const digitResults: BCDAddResult['digitResults'] = [];

  for (let i = maxLen - 1; i >= 0; i--) {
    const dA = parseInt(aPad[i]);
    const dB = parseInt(bPad[i]);
    const rawSum = dA + dB + carry;
    const rawBin = rawSum.toString(2).padStart(4, '0');
    const needsCorrection = rawSum > 9;
    let corrected = '';
    let newCarry = 0;

    if (needsCorrection) {
      const correctedVal = rawSum + 6;
      corrected = (correctedVal % 16).toString(2).padStart(4, '0');
      newCarry = correctedVal >= 16 ? 1 : (rawSum > 9 ? 1 : 0);
      carry = newCarry;
      steps.push({
        title: `Column ${maxLen - i}: ${dA} + ${dB} + carry ${carry > 0 ? 1 : 0}`,
        description: `${dA} + ${dB} = ${rawSum} > 9 → add correction +6 → ${rawSum + 6} = carry ${newCarry}, BCD ${corrected}`,
        value: corrected,
        highlight: { type: 'carry' },
        details: { 'Raw sum': rawSum, 'Correction (+6)': rawSum + 6, 'New carry': newCarry, 'BCD digit': corrected },
      });
    } else {
      corrected = rawBin;
      carry = 0;
      steps.push({
        title: `Column ${maxLen - i}: ${dA} + ${dB}`,
        description: `${dA} + ${dB} = ${rawSum} ≤ 9, no correction needed`,
        value: corrected,
        details: { 'Sum': rawSum, 'BCD digit': corrected },
      });
    }

    digitResults.unshift({ sum: rawSum, raw: rawBin, needsCorrection, corrected, carry: newCarry });
  }

  const bcdGroups = digitResults.map(r => r.corrected).join(' ');
  const decimalResult = parseInt(a) + parseInt(b);

  steps.push({
    title: 'Final BCD Result',
    description: `${a} + ${b} = ${decimalResult} → BCD: ${bcdGroups}`,
    value: bcdGroups,
    highlight: { type: 'result' },
  });

  return {
    result: {
      aDigits: aPad.split('').map(Number),
      bDigits: bPad.split('').map(Number),
      digitResults,
      finalBCD: bcdGroups,
      decimalResult,
    },
    steps,
    warnings,
    errors,
  };
}

// ── Excess-3 ──────────────────────────────────────────────────────────────────

export interface Excess3Result {
  digits: number[];
  excess3Groups: string[];
  fullExcess3: string;
}

export function decimalToExcess3(decStr: string): CalculationResult<Excess3Result> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const trimmed = decStr.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { result: { digits: [], excess3Groups: [], fullExcess3: '' }, steps, warnings, errors: [`"${trimmed}" is not a valid non-negative integer.`] };
  }

  steps.push({
    title: 'Excess-3 Encoding',
    description: 'Add 3 to each decimal digit, then convert to 4-bit binary.',
  });

  const digits = trimmed.split('').map(Number);
  const excess3Groups: string[] = [];

  digits.forEach((d, i) => {
    const exc = d + 3;
    const group = exc.toString(2).padStart(4, '0');
    excess3Groups.push(group);
    steps.push({
      title: `Digit ${i + 1}: ${d}`,
      description: `${d} + 3 = ${exc} → ${group}₂`,
      value: group,
      details: { Digit: d, '+3': exc, 'Excess-3 Binary': group },
    });
  });

  const fullExcess3 = excess3Groups.join(' ');
  steps.push({
    title: 'Result',
    description: `Excess-3 for ${decStr}: ${fullExcess3}`,
    value: fullExcess3,
    highlight: { type: 'result' },
  });

  return { result: { digits, excess3Groups, fullExcess3 }, steps, warnings, errors };
}

export function excess3ToDecimal(exc3Str: string): CalculationResult<number> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const normalized = exc3Str.replace(/\s+/g, '');
  if (!/^[01]+$/.test(normalized) || normalized.length % 4 !== 0) {
    return { result: 0, steps, warnings, errors: ['Input must be space-separated 4-bit binary groups (e.g. "0100 1000").'] };
  }

  steps.push({ title: 'Excess-3 Decoding', description: 'Subtract 3 from each 4-bit group.' });

  let decimalStr = '';
  for (let i = 0; i < normalized.length; i += 4) {
    const group = normalized.slice(i, i + 4);
    const val = parseInt(group, 2) - 3;
    if (val < 0 || val > 9) {
      return { result: 0, steps, warnings, errors: [`Group ${group} is not a valid Excess-3 digit (decoded to ${val}).`] };
    }
    decimalStr += val.toString();
    steps.push({
      title: `Group ${group}`,
      description: `${group}₂ = ${parseInt(group, 2)} − 3 = ${val}`,
      value: val.toString(),
    });
  }

  const result = parseInt(decimalStr, 10);
  steps.push({
    title: 'Result',
    description: `Decimal: ${decimalStr} = ${result}`,
    value: result.toString(),
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}
