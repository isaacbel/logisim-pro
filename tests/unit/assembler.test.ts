import { describe, it, expect } from 'vitest';
import { assembleProgram, disassembleWord, SAMPLE_PROGRAMS } from '@/architecture/engine/assembler';

describe('Computer Architecture Lab — Assembler & Disassembler', () => {
  it('should assemble basic R-type instructions to 16-bit words correctly', () => {
    // ADD R1, R2, R3
    // Opcode=1 (0001), Rd=1 (001), Rs=2 (010), Rt=3 (000011)
    // 0001 001 010 000011 = 0x1283
    const res = assembleProgram('ADD R1, R2, R3');
    expect(res.success).toBe(true);
    expect(res.machineCode.length).toBe(1);
    expect(res.machineCode[0]).toBe(0x1283);

    // Disassemble roundtrip
    const dis = disassembleWord(res.machineCode[0]);
    expect(dis).toBe('ADD R1, R2, R3');
  });

  it('should assemble I-type immediate and memory instructions', () => {
    // ADDI R1, R0, 5
    const res = assembleProgram('ADDI R1, R0, 5');
    expect(res.success).toBe(true);
    expect(disassembleWord(res.machineCode[0])).toBe('ADDI R1, R0, 5');

    // LOAD R2, [10]
    const resLoad = assembleProgram('LOAD R2, [10]');
    expect(resLoad.success).toBe(true);
    expect(disassembleWord(resLoad.machineCode[0])).toBe('LOAD R2, [10]');

    // STORE R3, [12]
    const resStore = assembleProgram('STORE R3, [12]');
    expect(resStore.success).toBe(true);
    expect(disassembleWord(resStore.machineCode[0])).toBe('STORE R3, [12]');
  });

  it('should resolve labels in two-pass assembly for branch and jump targets', () => {
    const code = `
      ADDI R1, R0, 5
LOOP: SUB R1, R1, R2
      BNE R1, R0, LOOP
      JMP END
      NOP
END:  HALT
    `;
    const res = assembleProgram(code);
    expect(res.success).toBe(true);
    expect(res.symbolTable['LOOP']).toBe(1);
    expect(res.symbolTable['END']).toBe(5);
    expect(res.machineCode.length).toBe(6);
  });

  it('should assemble all 4 built-in sample educational programs with 0 errors', () => {
    SAMPLE_PROGRAMS.forEach(prog => {
      const res = assembleProgram(prog.code);
      expect(res.success).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.machineCode.length).toBeGreaterThan(3);
    });
  });
});
