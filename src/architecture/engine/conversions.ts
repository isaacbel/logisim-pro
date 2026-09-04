// ─────────────────────────────────────────────────────────────────────────────
// Architecture Engine — Number Base Conversions
// All functions are pure and return CalculationResult with educational steps.
// ─────────────────────────────────────────────────────────────────────────────
import type { CalculationResult, CalculationStep } from './types';

// ── Validation helpers ────────────────────────────────────────────────────────

export function isValidBinary(s: string): boolean {
  return /^[01]+$/.test(s.trim());
}
export function isValidOctal(s: string): boolean {
  return /^[0-7]+$/.test(s.trim());
}
export function isValidHex(s: string): boolean {
  return /^[0-9a-fA-F]+$/.test(s.trim());
}
export function isValidDecimal(s: string): boolean {
  return /^-?\d+$/.test(s.trim());
}

// ── Decimal → Binary ──────────────────────────────────────────────────────────

export function decimalToBinary(decStr: string): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  if (!isValidDecimal(decStr)) {
    return { result: '', steps, warnings, errors: [`"${decStr}" is not a valid integer.`] };
  }

  const n = parseInt(decStr, 10);
  if (n < 0) {
    return { result: '', steps, warnings, errors: ['Use the Signed Numbers module for negative values.'] };
  }
  if (n === 0) {
    return { result: '0', steps: [{ title: 'Result', description: '0 in binary is 0', value: '0' }], warnings, errors };
  }

  const tableRows: string[] = [];
  let current = n;
  const remainders: number[] = [];

  steps.push({
    title: 'Successive Division by 2',
    description: `Divide ${n} repeatedly by 2. Record the remainders bottom-to-top.`,
  });

  while (current > 0) {
    const quotient = Math.floor(current / 2);
    const remainder = current % 2;
    remainders.push(remainder);
    tableRows.push(`${current} ÷ 2 = ${quotient}  remainder ${remainder}`);
    steps.push({
      title: `${current} ÷ 2`,
      description: `Quotient: ${quotient}, Remainder: ${remainder}`,
      value: remainder.toString(),
      details: { Number: current, Quotient: quotient, Remainder: remainder },
    });
    current = quotient;
  }

  const binaryResult = remainders.slice().reverse().join('');

  steps.push({
    title: 'Read Remainders Bottom → Top',
    description: `Remainders in order: ${remainders.join(', ')} → read reversed: ${binaryResult}`,
    value: binaryResult,
    highlight: { type: 'result' },
  });

  steps.push({
    title: 'Verify',
    description: `Parsing ${binaryResult}₂ as decimal = ${parseInt(binaryResult, 2)} ✓`,
    value: binaryResult,
  });

  return { result: binaryResult, steps, warnings, errors };
}

// ── Binary → Decimal ──────────────────────────────────────────────────────────

export function binaryToDecimal(binStr: string): CalculationResult<number> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const trimmed = binStr.trim();
  if (!isValidBinary(trimmed)) {
    return { result: 0, steps, warnings, errors: [`"${trimmed}" contains invalid binary digits (only 0 and 1 allowed).`] };
  }

  const bits = trimmed.split('');
  const len = bits.length;

  steps.push({
    title: 'Positional Notation',
    description: `Each bit multiplied by its power of 2 (MSB = bit ${len - 1}, LSB = bit 0)`,
  });

  let sum = 0;
  const terms: string[] = [];
  const values: number[] = [];

  bits.forEach((bit, i) => {
    const pos = len - 1 - i;
    const val = parseInt(bit) * Math.pow(2, pos);
    terms.push(`${bit}×2^${pos}`);
    values.push(val);
    steps.push({
      title: `Bit ${pos}`,
      description: `${bit} × 2^${pos} = ${bit} × ${Math.pow(2, pos)} = ${val}`,
      value: val.toString(),
      details: { Bit: bit, Position: pos, 'Power of 2': Math.pow(2, pos), Value: val },
    });
    sum += val;
  });

  steps.push({
    title: 'Sum All Terms',
    description: `${terms.join(' + ')} = ${values.join(' + ')} = ${sum}`,
    value: sum.toString(),
    highlight: { type: 'result' },
  });

  return { result: sum, steps, warnings, errors };
}

// ── Binary → Octal ────────────────────────────────────────────────────────────

export function binaryToOctal(binStr: string): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const trimmed = binStr.trim();
  if (!isValidBinary(trimmed)) {
    return { result: '', steps, warnings, errors: [`"${trimmed}" is not a valid binary number.`] };
  }

  // Pad to multiple of 3
  const padded = trimmed.padStart(Math.ceil(trimmed.length / 3) * 3, '0');

  steps.push({
    title: 'Pad to Multiple of 3 Bits',
    description: `Original: ${trimmed} → Padded: ${padded} (${padded.length} bits)`,
    value: padded,
  });

  const groups: string[] = [];
  const octalDigits: string[] = [];

  for (let i = 0; i < padded.length; i += 3) {
    const group = padded.slice(i, i + 3);
    const digit = parseInt(group, 2).toString(8);
    groups.push(group);
    octalDigits.push(digit);
    steps.push({
      title: `Group: ${group}`,
      description: `Binary ${group} = ${parseInt(group, 2)} decimal = ${digit} octal`,
      value: digit,
      details: { 'Binary Group': group, 'Decimal Value': parseInt(group, 2), 'Octal Digit': digit },
    });
  }

  const result = octalDigits.join('');
  steps.push({
    title: 'Concatenate Octal Digits',
    description: `Groups: ${groups.join(' ')} → Digits: ${octalDigits.join(' ')} → ${result}₈`,
    value: result,
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}

// ── Binary → Hexadecimal ──────────────────────────────────────────────────────

export function binaryToHex(binStr: string): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const trimmed = binStr.trim();
  if (!isValidBinary(trimmed)) {
    return { result: '', steps, warnings, errors: [`"${trimmed}" is not a valid binary number.`] };
  }

  const padded = trimmed.padStart(Math.ceil(trimmed.length / 4) * 4, '0');

  steps.push({
    title: 'Pad to Multiple of 4 Bits',
    description: `Original: ${trimmed} → Padded: ${padded} (${padded.length} bits)`,
    value: padded,
  });

  const groups: string[] = [];
  const hexDigits: string[] = [];

  for (let i = 0; i < padded.length; i += 4) {
    const group = padded.slice(i, i + 4);
    const digit = parseInt(group, 2).toString(16).toUpperCase();
    groups.push(group);
    hexDigits.push(digit);
    steps.push({
      title: `Group: ${group}`,
      description: `Binary ${group} = ${parseInt(group, 2)} decimal = ${digit} hex`,
      value: digit,
      details: { 'Binary Group': group, 'Decimal Value': parseInt(group, 2), 'Hex Digit': digit },
    });
  }

  const result = hexDigits.join('');
  steps.push({
    title: 'Concatenate Hex Digits',
    description: `Groups: ${groups.join(' ')} → Digits: ${hexDigits.join(' ')} → ${result}₁₆`,
    value: result,
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}

// ── Octal → Binary ────────────────────────────────────────────────────────────

export function octalToBinary(octStr: string): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const trimmed = octStr.trim();
  if (!isValidOctal(trimmed)) {
    return { result: '', steps, warnings, errors: [`"${trimmed}" is not a valid octal number (digits 0–7 only).`] };
  }

  steps.push({
    title: 'Convert Each Octal Digit to 3-Bit Binary',
    description: 'Every octal digit maps to exactly 3 binary bits.',
  });

  const binaryGroups: string[] = [];
  for (const ch of trimmed) {
    const digit = parseInt(ch, 8);
    const group = digit.toString(2).padStart(3, '0');
    binaryGroups.push(group);
    steps.push({
      title: `Octal digit: ${ch}`,
      description: `${ch}₈ = ${digit}₁₀ = ${group}₂`,
      value: group,
      details: { 'Octal Digit': ch, Decimal: digit, 'Binary (3 bits)': group },
    });
  }

  const raw = binaryGroups.join('');
  // Remove leading zeros (but keep at least one digit)
  const result = raw.replace(/^0+/, '') || '0';

  steps.push({
    title: 'Concatenate Binary Groups',
    description: `${binaryGroups.join(' ')} = ${raw}`,
    value: result,
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}

// ── Hex → Binary ─────────────────────────────────────────────────────────────

export function hexToBinary(hexStr: string): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const trimmed = hexStr.trim().toUpperCase();
  if (!isValidHex(trimmed)) {
    return { result: '', steps, warnings, errors: [`"${trimmed}" is not a valid hexadecimal number.`] };
  }

  steps.push({
    title: 'Convert Each Hex Digit to 4-Bit Binary',
    description: 'Every hex digit maps to exactly 4 binary bits.',
  });

  const binaryGroups: string[] = [];
  for (const ch of trimmed) {
    const digit = parseInt(ch, 16);
    const group = digit.toString(2).padStart(4, '0');
    binaryGroups.push(group);
    steps.push({
      title: `Hex digit: ${ch}`,
      description: `${ch}₁₆ = ${digit}₁₀ = ${group}₂`,
      value: group,
      details: { 'Hex Digit': ch, Decimal: digit, 'Binary (4 bits)': group },
    });
  }

  const raw = binaryGroups.join('');
  const result = raw.replace(/^0+/, '') || '0';

  steps.push({
    title: 'Concatenate Binary Groups',
    description: `${binaryGroups.join(' ')} = ${raw}`,
    value: result,
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}

// ── Decimal → Octal ───────────────────────────────────────────────────────────

export function decimalToOctal(decStr: string): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  if (!isValidDecimal(decStr)) {
    return { result: '', steps, warnings, errors: [`"${decStr}" is not a valid integer.`] };
  }

  const n = parseInt(decStr, 10);
  if (n < 0) return { result: '', steps, warnings, errors: ['Negative values not supported here.'] };
  if (n === 0) return { result: '0', steps: [{ title: 'Result', description: '0 in octal is 0', value: '0' }], warnings, errors };

  steps.push({ title: 'Successive Division by 8', description: `Divide ${n} by 8 repeatedly.` });

  let current = n;
  const remainders: number[] = [];
  while (current > 0) {
    const quotient = Math.floor(current / 8);
    const remainder = current % 8;
    remainders.push(remainder);
    steps.push({
      title: `${current} ÷ 8`,
      description: `Quotient: ${quotient}, Remainder: ${remainder}`,
      value: remainder.toString(),
      details: { Number: current, Quotient: quotient, Remainder: remainder },
    });
    current = quotient;
  }

  const result = remainders.slice().reverse().join('');
  steps.push({
    title: 'Read Remainders Bottom → Top',
    description: `Result: ${result}₈`,
    value: result,
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}

// ── Decimal → Hex ─────────────────────────────────────────────────────────────

export function decimalToHex(decStr: string): CalculationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  if (!isValidDecimal(decStr)) {
    return { result: '', steps, warnings, errors: [`"${decStr}" is not a valid integer.`] };
  }

  const n = parseInt(decStr, 10);
  if (n < 0) return { result: '', steps, warnings, errors: ['Negative values not supported here.'] };
  if (n === 0) return { result: '0', steps: [{ title: 'Result', description: '0 in hex is 0', value: '0' }], warnings, errors };

  steps.push({ title: 'Successive Division by 16', description: `Divide ${n} by 16 repeatedly.` });

  const HEX_DIGITS = '0123456789ABCDEF';
  let current = n;
  const remainders: string[] = [];
  while (current > 0) {
    const quotient = Math.floor(current / 16);
    const remainder = current % 16;
    remainders.push(HEX_DIGITS[remainder]);
    steps.push({
      title: `${current} ÷ 16`,
      description: `Quotient: ${quotient}, Remainder: ${remainder} = ${HEX_DIGITS[remainder]}₁₆`,
      value: HEX_DIGITS[remainder],
      details: { Number: current, Quotient: quotient, Remainder: remainder, 'Hex digit': HEX_DIGITS[remainder] },
    });
    current = quotient;
  }

  const result = remainders.slice().reverse().join('');
  steps.push({
    title: 'Read Remainders Bottom → Top',
    description: `Result: ${result}₁₆`,
    value: result,
    highlight: { type: 'result' },
  });

  return { result, steps, warnings, errors };
}

// ── Octal → Decimal ───────────────────────────────────────────────────────────

export function octalToDecimal(octStr: string): CalculationResult<number> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const trimmed = octStr.trim();
  if (!isValidOctal(trimmed)) {
    return { result: 0, steps, warnings, errors: [`"${trimmed}" is not a valid octal number.`] };
  }

  // Via binary intermediate for educational clarity
  const binResult = octalToBinary(trimmed);
  if (binResult.errors.length) return { result: 0, steps, warnings, errors: binResult.errors };
  steps.push(...binResult.steps);

  const decResult = binaryToDecimal(binResult.result);
  steps.push(...decResult.steps);

  return { result: decResult.result, steps, warnings, errors };
}

// ── Hex → Decimal ─────────────────────────────────────────────────────────────

export function hexToDecimal(hexStr: string): CalculationResult<number> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: CalculationStep[] = [];

  const trimmed = hexStr.trim().toUpperCase();
  if (!isValidHex(trimmed)) {
    return { result: 0, steps, warnings, errors: [`"${trimmed}" is not a valid hex number.`] };
  }

  // Via binary for educational clarity
  const binResult = hexToBinary(trimmed);
  if (binResult.errors.length) return { result: 0, steps, warnings, errors: binResult.errors };
  steps.push(...binResult.steps);

  const decResult = binaryToDecimal(binResult.result);
  steps.push(...decResult.steps);

  return { result: decResult.result, steps, warnings, errors };
}

// ── Universal: convert any base to all representations ────────────────────────

export interface AllBaseRepresentations {
  decimal: string;
  binary: string;
  octal: string;
  hex: string;
  errors: string[];
}

export function convertToAllBases(value: string, fromBase: 2 | 8 | 10 | 16): AllBaseRepresentations {
  let decimal = 0;
  const errors: string[] = [];

  try {
    const trimmed = value.trim();
    if (fromBase === 2) {
      if (!isValidBinary(trimmed)) { errors.push('Invalid binary input.'); return { decimal: '', binary: '', octal: '', hex: '', errors }; }
      decimal = parseInt(trimmed, 2);
    } else if (fromBase === 8) {
      if (!isValidOctal(trimmed)) { errors.push('Invalid octal input.'); return { decimal: '', binary: '', octal: '', hex: '', errors }; }
      decimal = parseInt(trimmed, 8);
    } else if (fromBase === 10) {
      if (!isValidDecimal(trimmed) || parseInt(trimmed, 10) < 0) { errors.push('Invalid decimal input (must be non-negative integer).'); return { decimal: '', binary: '', octal: '', hex: '', errors }; }
      decimal = parseInt(trimmed, 10);
    } else {
      if (!isValidHex(trimmed)) { errors.push('Invalid hexadecimal input.'); return { decimal: '', binary: '', octal: '', hex: '', errors }; }
      decimal = parseInt(trimmed, 16);
    }
  } catch {
    errors.push('Conversion error.');
    return { decimal: '', binary: '', octal: '', hex: '', errors };
  }

  return {
    decimal: decimal.toString(10),
    binary: decimal.toString(2),
    octal: decimal.toString(8),
    hex: decimal.toString(16).toUpperCase(),
    errors: [],
  };
}
