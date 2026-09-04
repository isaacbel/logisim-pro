import { describe, it, expect } from 'vitest';
import {
  decimalToBinary, binaryToDecimal, binaryToOctal, binaryToHex,
  octalToBinary, hexToBinary, decimalToOctal, decimalToHex,
  convertToAllBases,
} from '@/architecture/engine/conversions';

describe('Architecture Engine — Conversions', () => {
  it('converts decimal 13 to binary 1101 with educational steps', () => {
    const res = decimalToBinary('13');
    expect(res.errors).toHaveLength(0);
    expect(res.result).toBe('1101');
    expect(res.steps.length).toBeGreaterThanOrEqual(4);
    expect(res.steps[0].title).toBe('Successive Division by 2');
  });

  it('converts binary 1101 to decimal 13', () => {
    const res = binaryToDecimal('1101');
    expect(res.errors).toHaveLength(0);
    expect(res.result).toBe(13);
    expect(res.steps.length).toBe(6); // Positional notation + 4 bits + sum
  });

  it('converts binary 101101 to octal 55', () => {
    const res = binaryToOctal('101101');
    expect(res.errors).toHaveLength(0);
    expect(res.result).toBe('55');
  });

  it('converts binary 101101 to hex 2D', () => {
    const res = binaryToHex('101101');
    expect(res.errors).toHaveLength(0);
    expect(res.result).toBe('2D');
  });

  it('converts octal 55 to binary', () => {
    const res = octalToBinary('55');
    expect(res.errors).toHaveLength(0);
    expect(res.result).toBe('101101');
  });

  it('converts hex 2D to binary', () => {
    const res = hexToBinary('2D');
    expect(res.errors).toHaveLength(0);
    expect(res.result).toBe('101101');
  });

  it('converts decimal 45 to octal and hex', () => {
    expect(decimalToOctal('45').result).toBe('55');
    expect(decimalToHex('45').result).toBe('2D');
  });

  it('converts to all bases accurately', () => {
    const all = convertToAllBases('45', 10);
    expect(all.errors).toHaveLength(0);
    expect(all.decimal).toBe('45');
    expect(all.binary).toBe('101101');
    expect(all.octal).toBe('55');
    expect(all.hex).toBe('2D');
  });

  it('handles zero cleanly', () => {
    expect(decimalToBinary('0').result).toBe('0');
    expect(decimalToOctal('0').result).toBe('0');
    expect(decimalToHex('0').result).toBe('0');
  });

  it('gracefully reports invalid input without throwing', () => {
    const res = decimalToBinary('invalid');
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.result).toBe('');
  });
});
