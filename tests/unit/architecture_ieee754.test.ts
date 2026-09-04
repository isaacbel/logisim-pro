import { describe, it, expect } from 'vitest';
import {
  decimalToIEEE754, ieee754ToDecimal
} from '@/architecture/engine/ieee754';

describe('Architecture Engine — IEEE 754', () => {
  it('encodes Float32 single precision for 1.0', () => {
    const res = decimalToIEEE754('1.0', 'float32');
    expect(res.errors).toHaveLength(0);
    expect(res.result.sign).toBe('0');
    expect(res.result.exponent).toBe('01111111'); // 127 bias
    expect(res.result.mantissa).toBe('0'.repeat(23));
  });

  it('encodes Float32 for -1.0', () => {
    const res = decimalToIEEE754('-1.0', 'float32');
    expect(res.result.sign).toBe('1');
    expect(res.result.exponent).toBe('01111111');
  });

  it('encodes and decodes 3.14159', () => {
    const enc = decimalToIEEE754('3.14159', 'float32');
    expect(enc.errors).toHaveLength(0);
    const dec = ieee754ToDecimal(enc.result.sign, enc.result.exponent, enc.result.mantissa, 'float32');
    expect(dec.errors).toHaveLength(0);
    expect(dec.result).toBeCloseTo(3.14159, 4);
  });

  it('correctly handles special values: +0 and -0', () => {
    const posZero = decimalToIEEE754('0', 'float32');
    expect(posZero.result.isZero).toBe(true);
    expect(posZero.result.sign).toBe('0');

    const negZero = decimalToIEEE754('-0', 'float32');
    expect(negZero.result.isZero).toBe(true);
    expect(negZero.result.sign).toBe('1');
  });

  it('correctly handles Infinity and NaN', () => {
    const posInf = decimalToIEEE754('Infinity', 'float32');
    expect(posInf.result.isInfinity).toBe(true);
    expect(posInf.result.exponent).toBe('11111111');
    expect(posInf.result.mantissa).toBe('0'.repeat(23));

    const nanVal = decimalToIEEE754('NaN', 'float32');
    expect(nanVal.result.isNaN).toBe(true);
    expect(nanVal.result.exponent).toBe('11111111');
  });
});
