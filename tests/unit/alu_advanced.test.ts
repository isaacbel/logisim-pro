import { describe, it, expect } from 'vitest';
import { computeALU } from '@/architecture/engine/aluEngine';

describe('Computer Architecture Lab — Exhaustive ALU Operations & Flag Verification', () => {
  it('ADD: should handle zero addition without flags', () => {
    const res = computeALU(0, 0, 0, 8);
    expect(res.result).toBe(0);
    expect(res.flags.zero).toBe(true);
    expect(res.flags.negative).toBe(false);
    expect(res.flags.carry).toBe(false);
    expect(res.flags.overflow).toBe(false);
  });

  it('ADD: should detect signed overflow when adding two large positive numbers', () => {
    // 0x7F (127) + 0x01 (1) = 0x80 (128 unsigned, -128 signed) -> Overflow!
    const res = computeALU(0, 127, 1, 8);
    expect(res.result).toBe(128);
    expect(res.flags.overflow).toBe(true);
    expect(res.flags.negative).toBe(true);
    expect(res.flags.carry).toBe(false);
  });

  it('ADD: should detect signed overflow when adding two negative numbers', () => {
    // -128 (0x80) + -1 (0xFF) = -129 -> wraps
    const res = computeALU(0, 0x80, 0xFF, 8);
    expect(res.flags.carry).toBe(true);
  });

  it('SUB: should detect zero result when operands are equal', () => {
    const res = computeALU(1, 200, 200, 8);
    expect(res.result).toBe(0);
    expect(res.flags.zero).toBe(true);
    expect(res.flags.carry).toBe(false);
  });

  it('SUB: should assert borrow/carry flag when subtracting larger from smaller', () => {
    const res = computeALU(1, 50, 100, 8);
    expect(res.flags.carry).toBe(true); // Borrow
    expect(res.flags.negative).toBe(true);
  });

  it('AND: should correctly mask bits across 16-bit word', () => {
    const res = computeALU(2, 0xAAAA, 0x5555, 16);
    expect(res.result).toBe(0);
    expect(res.flags.zero).toBe(true);

    const res2 = computeALU(2, 0xFFFF, 0x1234, 16);
    expect(res2.result).toBe(0x1234);
    expect(res2.flags.zero).toBe(false);
  });

  it('OR: should correctly combine bits across 16-bit word', () => {
    const res = computeALU(3, 0xF0F0, 0x0F0F, 16);
    expect(res.result).toBe(0xFFFF);
    expect(res.flags.negative).toBe(true);
  });

  it('XOR: should compute parity bit-by-bit', () => {
    const res = computeALU(4, 0xFF, 0xFF, 8);
    expect(res.result).toBe(0);
    expect(res.flags.zero).toBe(true);

    const res2 = computeALU(4, 0xAA, 0x55, 8);
    expect(res2.result).toBe(0xFF);
  });

  it('NOT: should invert all bits', () => {
    const res = computeALU(5, 0x00, 0, 8);
    expect(res.result).toBe(0xFF);

    const res2 = computeALU(5, 0xFF, 0, 8);
    expect(res2.result).toBe(0x00);
    expect(res2.flags.zero).toBe(true);
  });

  it('SHL: should shift left by 1 bit and set carry on MSB overflow', () => {
    // 0x80 (1000 0000) << 1 = 0x00 with Carry=1
    const res = computeALU(6, 0x80, 0, 8);
    expect(res.result).toBe(0);
    expect(res.flags.carry).toBe(true);
    expect(res.flags.zero).toBe(true);

    // 0x07 << 1 = 0x0E (14) with Carry=0
    const res2 = computeALU(6, 7, 0, 8);
    expect(res2.result).toBe(14);
    expect(res2.flags.carry).toBe(false);
  });

  it('SHR: should shift right by 1 bit and set carry on LSB', () => {
    // 0x09 (0000 1001) >> 1 = 0x04 with Carry=1
    const res = computeALU(7, 9, 0, 8);
    expect(res.result).toBe(4);
    expect(res.flags.carry).toBe(true);

    // 0x08 (0000 1000) >> 1 = 0x04 with Carry=0
    const res2 = computeALU(7, 8, 0, 8);
    expect(res2.result).toBe(4);
    expect(res2.flags.carry).toBe(false);
  });

  it('32-bit ALU: should accurately compute 32-bit addition', () => {
    const res = computeALU(0, 0x10000000, 0x20000000, 32);
    expect(res.result).toBe(0x30000000);
    expect(res.flags.zero).toBe(false);
  });
});
