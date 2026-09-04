import { describe, it, expect } from 'vitest';
import {
  toSignMagnitude, toOnesComplement, toTwosComplement,
  twosComplementToDecimal, twosComplementAdd, twosComplementSubtract
} from '@/architecture/engine/signed';

describe('Architecture Engine — Signed Numbers', () => {
  it('encodes sign-magnitude for positive and negative values', () => {
    const pos = toSignMagnitude(5, 4);
    expect(pos.result).toBe('0101');

    const neg = toSignMagnitude(-5, 4);
    expect(neg.result).toBe('1101');
  });

  it('encodes one\'s complement for positive and negative values', () => {
    const pos = toOnesComplement(5, 4);
    expect(pos.result).toBe('0101');

    const neg = toOnesComplement(-5, 4);
    expect(neg.result).toBe('1010'); // inverted bits of 0101
  });

  it('encodes two\'s complement for -42 in 8-bit', () => {
    const res = toTwosComplement(-42, 8);
    expect(res.errors).toHaveLength(0);
    // 42 = 00101010 -> invert 11010101 -> add 1 -> 11010110
    expect(res.result).toBe('11010110');
  });

  it('decodes two\'s complement 11010110 back to -42', () => {
    const res = twosComplementToDecimal('11010110', 8);
    expect(res.errors).toHaveLength(0);
    expect(res.result).toBe(-42);
  });

  it('performs two\'s complement addition: 15 + (-20) = -5', () => {
    const res = twosComplementAdd(15, -20, 8);
    expect(res.errors).toHaveLength(0);
    expect(res.result.decimalResult).toBe(-5);
    expect(res.result.overflow).toBe(false);
  });

  it('detects two\'s complement signed overflow: 100 + 50 > 127 in 8-bit', () => {
    const res = twosComplementAdd(100, 50, 8);
    expect(res.result.overflow).toBe(true);
  });

  it('performs two\'s complement subtraction: 10 - 25 = -15', () => {
    const res = twosComplementSubtract(10, 25, 8);
    expect(res.errors).toHaveLength(0);
    expect(res.result.decimalResult).toBe(-15);
  });
});
