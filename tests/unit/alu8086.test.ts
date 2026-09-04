import { describe, it, expect } from 'vitest';
import { executeAlu8086, initial8086Flags } from '../../src/architecture/engine/alu8086';

describe('8086 ALU Engine', () => {
  const flags0 = initial8086Flags();

  describe('16-bit Arithmetic', () => {
    it('performs ADD AX, BX correctly and updates ZF, SF, PF', () => {
      const res = executeAlu8086('ADD', 0x0005, 0x0003, true, flags0);
      expect(res.result).toBe(0x0008);
      expect(res.flags.zf).toBe(false);
      expect(res.flags.sf).toBe(false);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.of).toBe(false);
    });

    it('sets CF and AF on unsigned 16-bit overflow', () => {
      const res = executeAlu8086('ADD', 0xFFFF, 0x0001, true, flags0);
      expect(res.result).toBe(0x0000);
      expect(res.flags.zf).toBe(true);
      expect(res.flags.cf).toBe(true);
      expect(res.flags.af).toBe(true);
      expect(res.flags.of).toBe(false); // FFFF (-1) + 1 = 0, no signed overflow
    });

    it('sets OF on signed 16-bit overflow (positive + positive = negative)', () => {
      const res = executeAlu8086('ADD', 0x7FFF, 0x0001, true, flags0);
      expect(res.result).toBe(0x8000);
      expect(res.flags.sf).toBe(true);
      expect(res.flags.of).toBe(true);
      expect(res.flags.cf).toBe(false);
    });

    it('performs ADC with Carry-In flag', () => {
      const flagsWithCarry = { ...flags0, cf: true };
      const res = executeAlu8086('ADC', 0x0005, 0x0003, true, flagsWithCarry);
      expect(res.result).toBe(0x0009); // 5 + 3 + 1
    });

    it('performs SUB AX, BX correctly', () => {
      const res = executeAlu8086('SUB', 0x0010, 0x0006, true, flags0);
      expect(res.result).toBe(0x000A);
      expect(res.flags.zf).toBe(false);
      expect(res.flags.cf).toBe(false);
    });

    it('sets CF (borrow) and SF when subtracting larger number from smaller', () => {
      const res = executeAlu8086('SUB', 0x0004, 0x0009, true, flags0);
      expect(res.result).toBe(0xFFFB); // -5 in 16-bit 2's complement
      expect(res.flags.cf).toBe(true); // Borrow occurred
      expect(res.flags.sf).toBe(true);
      expect(res.flags.zf).toBe(false);
    });

    it('performs CMP without storing result but setting flags', () => {
      const res = executeAlu8086('CMP', 0x000A, 0x000A, true, flags0);
      expect(res.flags.zf).toBe(true);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.sf).toBe(false);
    });

    it('performs NEG correctly (0 - operand)', () => {
      const res = executeAlu8086('NEG', 0x0005, 0, true, flags0);
      expect(res.result).toBe(0xFFFB);
      expect(res.flags.cf).toBe(true); // Non-zero operand generates carry
      expect(res.flags.sf).toBe(true);
    });

    it('NEG 0 results in 0 and CF=0', () => {
      const res = executeAlu8086('NEG', 0x0000, 0, true, flags0);
      expect(res.result).toBe(0x0000);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.zf).toBe(true);
    });

    it('INC updates ZF and OF but preserves CF', () => {
      const flagsWithCarry = { ...flags0, cf: true };
      const res = executeAlu8086('INC', 0x0005, 0, true, flagsWithCarry);
      expect(res.result).toBe(0x0006);
      expect(res.flags.cf).toBe(true); // CF preserved!
    });

    it('DEC updates ZF and OF but preserves CF', () => {
      const flagsWithCarry = { ...flags0, cf: true };
      const res = executeAlu8086('DEC', 0x0001, 0, true, flagsWithCarry);
      expect(res.result).toBe(0x0000);
      expect(res.flags.zf).toBe(true);
      expect(res.flags.cf).toBe(true); // CF preserved!
    });
  });

  describe('8-bit Arithmetic', () => {
    it('performs 8-bit ADD with 8-bit overflow', () => {
      const res = executeAlu8086('ADD', 0xFF, 0x01, false, flags0);
      expect(res.result).toBe(0x00);
      expect(res.flags.zf).toBe(true);
      expect(res.flags.cf).toBe(true);
    });

    it('calculates parity flag (PF) based on low 8 bits', () => {
      // 0x03 has two 1-bits -> even parity -> PF = 1
      const res1 = executeAlu8086('ADD', 0x01, 0x02, false, flags0);
      expect(res1.flags.pf).toBe(true);

      // 0x07 has three 1-bits -> odd parity -> PF = 0
      const res2 = executeAlu8086('ADD', 0x03, 0x04, false, flags0);
      expect(res2.flags.pf).toBe(false);
    });
  });

  describe('Bitwise Logic Operations', () => {
    it('performs AND, clearing CF and OF', () => {
      const flagsWithCarry = { ...flags0, cf: true, of: true };
      const res = executeAlu8086('AND', 0x0F0F, 0x00FF, true, flagsWithCarry);
      expect(res.result).toBe(0x000F);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.of).toBe(false);
      expect(res.flags.zf).toBe(false);
    });

    it('performs OR and sets ZF if result is zero', () => {
      const res = executeAlu8086('OR', 0x0000, 0x0000, true, flags0);
      expect(res.result).toBe(0x0000);
      expect(res.flags.zf).toBe(true);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.of).toBe(false);
    });

    it('performs XOR and zeroes register', () => {
      const res = executeAlu8086('XOR', 0xABCD, 0xABCD, true, flags0);
      expect(res.result).toBe(0x0000);
      expect(res.flags.zf).toBe(true);
    });

    it('performs NOT without altering flags', () => {
      const flagsWithCarry = { ...flags0, cf: true, zf: true };
      const res = executeAlu8086('NOT', 0x5555, 0, true, flagsWithCarry);
      expect(res.result).toBe(0xAAAA);
      expect(res.flags.cf).toBe(true);
      expect(res.flags.zf).toBe(true);
    });

    it('performs TEST without storing result', () => {
      const res = executeAlu8086('TEST', 0x0001, 0x0002, true, flags0);
      expect(res.flags.zf).toBe(true);
    });
  });

  describe('Shift and Rotate Operations', () => {
    it('performs SHL / SAL left shift', () => {
      const res = executeAlu8086('SHL', 0x4000, 1, true, flags0);
      expect(res.result).toBe(0x8000);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.sf).toBe(true);
    });

    it('shifts MSB into CF on SHL', () => {
      const res = executeAlu8086('SHL', 0x8000, 1, true, flags0);
      expect(res.result).toBe(0x0000);
      expect(res.flags.cf).toBe(true);
      expect(res.flags.zf).toBe(true);
    });

    it('performs SHR logical right shift (zero fill MSB)', () => {
      const res = executeAlu8086('SHR', 0x8000, 1, true, flags0);
      expect(res.result).toBe(0x4000);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.sf).toBe(false);
    });

    it('performs SAR arithmetic right shift (sign fill MSB)', () => {
      const res = executeAlu8086('SAR', 0x8000, 1, true, flags0);
      expect(res.result).toBe(0xC000);
      expect(res.flags.sf).toBe(true);
      expect(res.flags.cf).toBe(false);
    });

    it('performs ROL rotate left', () => {
      const res = executeAlu8086('ROL', 0x8001, 1, true, flags0);
      expect(res.result).toBe(0x0003);
      expect(res.flags.cf).toBe(true);
    });

    it('performs ROR rotate right', () => {
      const res = executeAlu8086('ROR', 0x0003, 1, true, flags0);
      expect(res.result).toBe(0x8001);
      expect(res.flags.cf).toBe(true);
    });
  });

  describe('BCD & Conversion Instructions', () => {
    it('performs DAA decimal adjust after addition', () => {
      // 0x38 + 0x47 = 0x7F in AL -> DAA adjusts to 0x85 (BCD 85)
      const res = executeAlu8086('DAA', 0x7F, 0, false, flags0);
      expect(res.result).toBe(0x85);
    });

    it('performs CBW convert byte to word with sign extension', () => {
      // Negative byte 0xF0 (-16) -> 0xFFF0
      const res1 = executeAlu8086('CBW', 0x00F0, 0, true, flags0);
      expect(res1.result).toBe(0xFFF0);

      // Positive byte 0x05 (+5) -> 0x0005
      const res2 = executeAlu8086('CBW', 0x0005, 0, true, flags0);
      expect(res2.result).toBe(0x0005);
    });
  });
});
