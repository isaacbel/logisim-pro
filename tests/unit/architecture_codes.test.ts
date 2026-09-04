import { describe, it, expect } from 'vitest';
import {
  decimalToBCD, bcdAdd, decimalToExcess3, excess3ToDecimal
} from '@/architecture/engine/codes';

describe('Architecture Engine — Special Codes', () => {
  it('encodes decimal 59 to BCD 0101 1001', () => {
    const res = decimalToBCD('59');
    expect(res.errors).toHaveLength(0);
    expect(res.result.bcdGroups).toEqual(['0101', '1001']);
    expect(res.result.fullBCD).toBe('0101 1001');
  });

  it('performs BCD addition with +6 correction: 38 + 45 = 83', () => {
    const res = bcdAdd('38', '45');
    expect(res.errors).toHaveLength(0);
    expect(res.result.decimalResult).toBe(83);
    expect(res.result.finalBCD).toBe('0000 1000 0011'); // 0 8 3
  });

  it('encodes decimal 72 to Excess-3 (10 5 -> 1010 0101)', () => {
    const res = decimalToExcess3('72');
    expect(res.errors).toHaveLength(0);
    // 7 + 3 = 10 (1010), 2 + 3 = 5 (0101)
    expect(res.result.excess3Groups).toEqual(['1010', '0101']);
    expect(res.result.fullExcess3).toBe('1010 0101');
  });

  it('decodes Excess-3 back to decimal', () => {
    const res = excess3ToDecimal('1010 0101');
    expect(res.errors).toHaveLength(0);
    expect(res.result).toBe(72);
  });
});
