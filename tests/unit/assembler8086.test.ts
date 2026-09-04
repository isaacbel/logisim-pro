import { describe, it, expect } from 'vitest';
import { assemble8086, disassemble8086 } from '../../src/architecture/engine/assembler8086';

describe('8086 Assembler & Disassembler', () => {
  describe('Instruction Encodings', () => {
    it('encodes MOV reg, imm16 (0xB8 + reg)', () => {
      const res = assemble8086('MOV AX, 1234H');
      expect(res.success).toBe(true);
      expect(res.machineCode).toEqual([0xB8, 0x34, 0x12]);
    });

    it('encodes MOV reg, reg (0x89 ModR/M)', () => {
      const res = assemble8086('MOV BX, AX');
      expect(res.success).toBe(true);
      expect(res.machineCode[0]).toBe(0x89);
    });

    it('encodes PUSH reg (0x50 + reg)', () => {
      const res = assemble8086('PUSH AX');
      expect(res.success).toBe(true);
      expect(res.machineCode).toEqual([0x50]);

      const resBX = assemble8086('PUSH BX');
      expect(resBX.machineCode).toEqual([0x53]);
    });

    it('encodes POP reg (0x58 + reg)', () => {
      const res = assemble8086('POP AX');
      expect(res.success).toBe(true);
      expect(res.machineCode).toEqual([0x58]);
    });

    it('encodes single-byte instructions NOP, HLT, RET, PUSHF, POPF', () => {
      expect(assemble8086('NOP').machineCode).toEqual([0x90]);
      expect(assemble8086('HLT').machineCode).toEqual([0xF4]);
      expect(assemble8086('RET').machineCode).toEqual([0xC3]);
      expect(assemble8086('PUSHF').machineCode).toEqual([0x9C]);
      expect(assemble8086('POPF').machineCode).toEqual([0x9D]);
      expect(assemble8086('CLC').machineCode).toEqual([0xF8]);
      expect(assemble8086('STC').machineCode).toEqual([0xF9]);
    });

    it('resolves forward and backward label addresses correctly in two passes', () => {
      const code = `
        MOV CX, 0005H
      LOOP_START:
        DEC CX
        JNZ LOOP_START
        HLT
      `;
      const res = assemble8086(code);
      expect(res.success).toBe(true);
      expect(res.labels['LOOP_START']).toBeDefined();
    });
  });

  describe('Error Detection', () => {
    it('returns error for unknown mnemonics', () => {
      const res = assemble8086('INVALID_INSTRUCTION AX, BX');
      expect(res.success).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors[0].message).toContain('Unknown instruction');
    });

    it('returns error for missing required operands', () => {
      const res = assemble8086('MOV AX');
      expect(res.success).toBe(false);
      expect(res.errors[0].message).toContain('requires two operands');
    });

    it('returns error for unresolved branch labels', () => {
      const res = assemble8086('JMP NON_EXISTENT_LABEL');
      expect(res.success).toBe(false);
      expect(res.errors[0].message).toContain('Undefined label');
    });
  });

  describe('Disassembler', () => {
    it('disassembles machine bytes accurately', () => {
      const dis = disassemble8086([0xB8, 0x34, 0x12, 0xF4]);
      expect(dis).toContain('MOV AX, 1234H');
      expect(dis).toContain('HLT');
    });
  });
});
