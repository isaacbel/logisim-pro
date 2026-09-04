import { describe, it, expect } from 'vitest';
import {
  decimalToFixedPoint, fixedPointToDecimal
} from '@/architecture/engine/fixedPoint';

describe('Architecture Engine — Fixed-Point', () => {
  it('converts 13.625 to Q8.8 fixed-point binary', () => {
    const res = decimalToFixedPoint('13.625', 8, 8);
    expect(res.errors).toHaveLength(0);
    expect(res.result.intBinary).toBe('00001101'); // 13
    expect(res.result.fracBinary).toBe('10100000'); // 0.625 = 0.5 + 0.125
    expect(res.result.fullBinary).toBe('00001101.10100000');
    expect(res.result.truncated).toBe(false);
  });

  it('reconstructs fixed-point binary to decimal accurately', () => {
    const res = fixedPointToDecimal('00001101', '10100000');
    expect(res.errors).toHaveLength(0);
    expect(res.result).toBe(13.625);
  });

  it('detects fractional truncation for numbers like 0.1', () => {
    const res = decimalToFixedPoint('0.1', 8, 8);
    expect(res.result.truncated).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});
