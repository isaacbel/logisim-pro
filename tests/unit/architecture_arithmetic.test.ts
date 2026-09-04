import { describe, it, expect } from 'vitest';
import {
  binaryAdd, binaryMultiply, binaryDivide, analyzeOverflow
} from '@/architecture/engine/arithmetic';

describe('Architecture Engine — Binary Arithmetic', () => {
  it('adds binary numbers 1011 (11) and 0110 (6) accurately', () => {
    const res = binaryAdd('1011', '0110', 4);
    expect(res.errors).toHaveLength(0);
    expect(res.result.decimalA).toBe(11);
    expect(res.result.decimalB).toBe(6);
    expect(res.result.sum).toBe('0001'); // 17 mod 16 = 1
    expect(res.result.overflow).toBe(true); // carry out for 4-bit
    expect(res.result.decimalResult).toBe(17);
  });

  it('adds within range without overflow', () => {
    const res = binaryAdd('0011', '0100', 4); // 3 + 4 = 7
    expect(res.result.overflow).toBe(false);
    expect(res.result.sum).toBe('0111');
    expect(res.result.decimalResult).toBe(7);
  });

  it('multiplies binary numbers with partial products', () => {
    const res = binaryMultiply('0011', '0101', 4); // 3 * 5 = 15
    expect(res.errors).toHaveLength(0);
    expect(res.result.decimalResult).toBe(15);
    expect(res.result.product).toBe('00001111'); // 8-bit result
    expect(res.result.partialProducts).toHaveLength(4);
  });

  it('divides binary numbers using restoring division', () => {
    const res = binaryDivide('1101', '0011', 4); // 13 / 3 = 4 rem 1
    expect(res.errors).toHaveLength(0);
    expect(res.result.decimalQuotient).toBe(4);
    expect(res.result.decimalRemainder).toBe(1);
    expect(res.result.quotient).toBe('0100');
    expect(res.result.remainder).toBe('0001');
  });

  it('handles division by zero safely', () => {
    const res = binaryDivide('1101', '0000', 4);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain('Division by zero');
  });

  it('analyzes unsigned and signed overflow limits', () => {
    const res = analyzeOverflow(300, 8); // 8-bit unsigned max = 255
    expect(res.result.unsignedOverflow).toBe(true);
    expect(res.result.signedOverflow).toBe(true);

    const resIn = analyzeOverflow(42, 8);
    expect(resIn.result.unsignedOverflow).toBe(false);
    expect(resIn.result.signedOverflow).toBe(false);
  });
});
