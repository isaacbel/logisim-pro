// ─────────────────────────────────────────────────────────────────────────────
// Architecture Engine — IEEE 754 Floating-Point
// ─────────────────────────────────────────────────────────────────────────────
import type { CalculationResult, CalculationStep, IEEEFormat } from './types';

export interface IEEE754Fields {
  sign: string;
  exponent: string;
  mantissa: string;
  signBits: 1;
  exponentBits: number;
  mantissaBits: number;
  bias: number;
  isZero: boolean;
  isSubnormal: boolean;
  isInfinity: boolean;
  isNaN: boolean;
  decimalValue: number;
}

const FORMAT = {
  float32: { expBits: 8, mantBits: 23, bias: 127 },
  float64: { expBits: 11, mantBits: 52, bias: 1023 },
};

export function decimalToIEEE754(decStr: string, format: IEEEFormat): CalculationResult<IEEE754Fields> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];
  const { expBits, mantBits, bias } = FORMAT[format];

  // Parse special string values
  const trimmed = decStr.trim();
  let value: number;
  if (trimmed === 'Infinity' || trimmed === '+Infinity') value = Infinity;
  else if (trimmed === '-Infinity') value = -Infinity;
  else if (trimmed === 'NaN') value = NaN;
  else {
    value = parseFloat(trimmed);
    if (isNaN(value) && trimmed !== 'NaN') {
      return { result: buildEmpty(expBits, mantBits, bias), steps, warnings, errors: [`"${trimmed}" is not a valid floating-point number.`] };
    }
  }

  const empty = buildEmpty(expBits, mantBits, bias);

  // ── Special values ────────────────────────────────────────────────────────

  if (isNaN(value)) {
    steps.push({ title: 'NaN', description: 'Not a Number: exponent all 1s, mantissa non-zero', value: 'NaN' });
    const expStr = '1'.repeat(expBits);
    const mantStr = '0'.repeat(mantBits - 1) + '1';
    return {
      result: { sign: '0', exponent: expStr, mantissa: mantStr, signBits: 1, exponentBits: expBits, mantissaBits: mantBits, bias, isZero: false, isSubnormal: false, isInfinity: false, isNaN: true, decimalValue: NaN },
      steps, warnings, errors,
    };
  }

  if (!isFinite(value)) {
    const signBit = value < 0 ? '1' : '0';
    steps.push({ title: 'Infinity', description: `${value > 0 ? '+' : '−'}Infinity: exponent all 1s, mantissa all 0s`, value: signBit });
    const expStr = '1'.repeat(expBits);
    const mantStr = '0'.repeat(mantBits);
    return {
      result: { sign: signBit, exponent: expStr, mantissa: mantStr, signBits: 1, exponentBits: expBits, mantissaBits: mantBits, bias, isZero: false, isSubnormal: false, isInfinity: true, isNaN: false, decimalValue: value },
      steps, warnings, errors,
    };
  }

  if (value === 0) {
    const signBit = 1 / value === -Infinity ? '1' : '0';
    steps.push({ title: `${signBit === '1' ? '−0' : '+0'}`, description: 'Zero: all bits zero (except sign for -0)', value: signBit });
    const expStr = '0'.repeat(expBits);
    const mantStr = '0'.repeat(mantBits);
    return {
      result: { sign: signBit, exponent: expStr, mantissa: mantStr, signBits: 1, exponentBits: expBits, mantissaBits: mantBits, bias, isZero: true, isSubnormal: false, isInfinity: false, isNaN: false, decimalValue: 0 },
      steps, warnings, errors,
    };
  }

  // ── Normal encoding ───────────────────────────────────────────────────────

  const signBit = value < 0 ? '1' : '0';
  const absVal = Math.abs(value);

  steps.push({
    title: 'Step 1: Determine Sign',
    description: `${value} is ${value < 0 ? 'negative' : 'positive'} → sign bit = ${signBit}`,
    value: signBit,
    highlight: { type: 'sign', positions: [0] },
  });

  // Convert absolute value to binary
  const intPart = Math.floor(absVal);
  const fracPart = absVal - intPart;

  const intBin = intPart === 0 ? '0' : intPart.toString(2);
  let fracBin = '';
  let frac = fracPart;
  for (let i = 0; i < mantBits + 4; i++) {
    frac *= 2;
    fracBin += frac >= 1 ? '1' : '0';
    if (frac >= 1) frac -= 1;
  }

  const fullBin = intPart === 0 ? `0.${fracBin}` : `${intBin}.${fracBin}`;
  steps.push({
    title: 'Step 2: Convert to Binary',
    description: `|${value}| = ${absVal} → ${fullBin}₂`,
    value: fullBin,
  });

  // Normalize: 1.xxxxx × 2^e
  let exponent = 0;
  let mantissaStr = '';

  const combined = intBin + fracBin;
  const firstOne = combined.indexOf('1');

  if (firstOne === -1) {
    return { result: { ...empty, isZero: true }, steps, warnings, errors: ['Value too small to represent.'] };
  }

  if (intPart >= 1) {
    exponent = intBin.length - 1;
    const afterPoint = (intBin + fracBin).slice(1, mantBits + 2);
    mantissaStr = afterPoint.padEnd(mantBits, '0').slice(0, mantBits);
  } else {
    // Find first 1 in fractional part
    const fracOnly = fracBin;
    const leadingZeros = fracOnly.indexOf('1');
    exponent = -(leadingZeros + 1);
    mantissaStr = fracOnly.slice(leadingZeros + 1, leadingZeros + 1 + mantBits).padEnd(mantBits, '0');
  }

  steps.push({
    title: 'Step 3: Normalize',
    description: `1.${mantissaStr} × 2^${exponent}`,
    value: `1.${mantissaStr}`,
  });

  const biasedExp = exponent + bias;
  const expStr = biasedExp.toString(2).padStart(expBits, '0');

  steps.push({
    title: 'Step 4: Biased Exponent',
    description: `Exponent = ${exponent} + bias ${bias} = ${biasedExp} = ${expStr}₂`,
    value: expStr,
    highlight: { type: 'exponent' },
  });

  steps.push({
    title: 'Step 5: Mantissa (fractional bits after 1.)',
    description: `Mantissa = ${mantissaStr}`,
    value: mantissaStr,
    highlight: { type: 'mantissa' },
  });

  const isSubnormal = biasedExp <= 0;
  steps.push({
    title: 'Step 6: Final Representation',
    description: `[${signBit}][${expStr}][${mantissaStr}]`,
    value: `${signBit}${expStr}${mantissaStr}`,
    highlight: { type: 'result' },
  });

  return {
    result: {
      sign: signBit,
      exponent: expStr,
      mantissa: mantissaStr,
      signBits: 1,
      exponentBits: expBits,
      mantissaBits: mantBits,
      bias,
      isZero: false,
      isSubnormal,
      isInfinity: false,
      isNaN: false,
      decimalValue: value,
    },
    steps,
    warnings,
    errors,
  };
}

export function ieee754ToDecimal(
  sign: string,
  exponent: string,
  mantissa: string,
  format: IEEEFormat
): CalculationResult<number> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];
  const { bias } = FORMAT[format];

  const S = parseInt(sign);
  const E = parseInt(exponent, 2);
  const allOnes = (1 << exponent.length) - 1;
  const allZeroMant = /^0+$/.test(mantissa);

  steps.push({
    title: 'Fields',
    description: `Sign=${sign}, Exponent=${exponent} (${E}), Mantissa=${mantissa}`,
    value: `S=${sign} E=${E} M=${mantissa}`,
  });

  // Special values
  if (E === allOnes) {
    if (allZeroMant) {
      const inf = S === 0 ? Infinity : -Infinity;
      steps.push({ title: 'Infinity', description: `Exponent all 1s + mantissa all 0s → ${inf > 0 ? '+' : '−'}∞`, value: inf.toString() });
      return { result: inf, steps, warnings, errors };
    } else {
      steps.push({ title: 'NaN', description: 'Exponent all 1s + non-zero mantissa → NaN', value: 'NaN' });
      return { result: NaN, steps, warnings, errors };
    }
  }

  if (E === 0 && allZeroMant) {
    const zero = S === 0 ? 0 : -0;
    steps.push({ title: `${S === 1 ? '−0' : '+0'}`, description: 'All zero fields → ±0', value: '0' });
    return { result: zero, steps, warnings, errors };
  }

  const realExp = E === 0 ? 1 - bias : E - bias; // subnormal
  const implicit = E === 0 ? 0 : 1;

  steps.push({
    title: 'Real Exponent',
    description: `Biased exponent ${E} − bias ${bias} = ${realExp}`,
    value: realExp.toString(),
    highlight: { type: 'exponent' },
  });

  let mantValue = implicit;
  mantissa.split('').forEach((bit, i) => {
    mantValue += parseInt(bit) * Math.pow(2, -(i + 1));
  });

  steps.push({
    title: 'Mantissa Value',
    description: `${implicit}.${mantissa} = ${mantValue.toFixed(8)}`,
    value: mantValue.toFixed(8),
    highlight: { type: 'mantissa' },
  });

  const result = (S === 0 ? 1 : -1) * mantValue * Math.pow(2, realExp);

  steps.push({
    title: 'Final Value',
    description: `(−1)^${S} × ${mantValue.toFixed(6)} × 2^${realExp} = ${result}`,
    value: result.toString(),
    highlight: { type: 'result' },
  });

  if (E === 0) warnings.push('This is a subnormal (denormalized) number.');

  return { result, steps, warnings, errors };
}

function buildEmpty(expBits: number, mantBits: number, bias: number): IEEE754Fields {
  return {
    sign: '0', exponent: '0'.repeat(expBits), mantissa: '0'.repeat(mantBits),
    signBits: 1, exponentBits: expBits, mantissaBits: mantBits, bias,
    isZero: true, isSubnormal: false, isInfinity: false, isNaN: false, decimalValue: 0,
  };
}
