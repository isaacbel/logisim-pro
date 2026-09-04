import { describe, it, expect } from 'vitest';
import { computeALU, ALU_OPERATIONS } from '@/architecture/engine/aluEngine';

describe('Computer Architecture Lab — ALU Engine & Simulation Integration', () => {
  it('should support all 8 standard ALU operations with mathematical correctness', () => {
    expect(ALU_OPERATIONS.length).toBe(8);

    // ADD (0): 15 + 27 = 42
    const addRes = computeALU(0, 15, 27, 8);
    expect(addRes.result).toBe(42);
    expect(addRes.flags.zero).toBe(false);
    expect(addRes.flags.negative).toBe(false);

    // SUB (1): 42 - 15 = 27
    const subRes = computeALU(1, 42, 15, 8);
    expect(subRes.result).toBe(27);
    expect(subRes.flags.zero).toBe(false);

    // AND (2): 0b1100 & 0b1010 = 0b1000 (8)
    const andRes = computeALU(2, 0b1100, 0b1010, 8);
    expect(andRes.result).toBe(8);

    // OR (3): 0b1100 | 0b0011 = 0b1111 (15)
    const orRes = computeALU(3, 0b1100, 0b0011, 8);
    expect(orRes.result).toBe(15);

    // XOR (4): 0b1010 ^ 0b0110 = 0b1100 (12)
    const xorRes = computeALU(4, 0b1010, 0b0110, 8);
    expect(xorRes.result).toBe(12);

    // NOT (5): ~0b00001111 (8 bits) = 0b11110000 (240)
    const notRes = computeALU(5, 15, 0, 8);
    expect(notRes.result).toBe(240);

    // SHL (6): 5 << 1 = 10
    const shlRes = computeALU(6, 5, 0, 8);
    expect(shlRes.result).toBe(10);

    // SHR (7): 20 >> 1 = 10
    const shrRes = computeALU(7, 20, 0, 8);
    expect(shrRes.result).toBe(10);
  });

  it('should correctly assert Zero, Negative, Carry, and Overflow flags', () => {
    // Zero flag: 5 - 5 = 0
    const zeroTest = computeALU(1, 5, 5, 8);
    expect(zeroTest.result).toBe(0);
    expect(zeroTest.flags.zero).toBe(true);

    // Negative flag: 3 - 5 = -2 in 8-bit two's complement (254 / 0xFE, MSB=1)
    const negTest = computeALU(1, 3, 5, 8);
    expect(negTest.result).toBe(254);
    expect(negTest.flags.negative).toBe(true);
    expect(negTest.flags.carry).toBe(true); // Borrow occurred

    // Overflow flag (Signed): 120 + 20 in 8-bit signed exceeds +127 -> wraps to negative
    const ovfTest = computeALU(0, 120, 20, 8);
    expect(ovfTest.flags.overflow).toBe(true);

    // Carry flag (Unsigned): 200 + 100 in 8-bit unsigned exceeds 255
    const carryTest = computeALU(0, 200, 100, 8);
    expect(carryTest.flags.carry).toBe(true);
  });

  it('should adapt to different bus widths (4-bit, 16-bit, 32-bit)', () => {
    // 4-bit ADD: 9 + 8 = 17 -> masked to 1 with carry
    const res4 = computeALU(0, 9, 8, 4);
    expect(res4.result).toBe(1);
    expect(res4.flags.carry).toBe(true);

    // 16-bit ADD: 30000 + 40000 = 70000 -> masked to 4464 with carry
    const res16 = computeALU(0, 30000, 40000, 16);
    expect(res16.result).toBe(4464);
    expect(res16.flags.carry).toBe(true);
  });
});
