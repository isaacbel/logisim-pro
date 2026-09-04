import { describe, it, expect } from 'vitest';
import { INSTRUCTION_SET, decodeInstruction } from '@/architecture/engine/controlUnitEngine';

describe('Computer Architecture Lab — Control Unit Matrix', () => {
  it('should define all 16 micro-architectural instructions without duplicates', () => {
    expect(INSTRUCTION_SET.length).toBe(16);
    const opcodes = new Set(INSTRUCTION_SET.map(i => i.opcode));
    expect(opcodes.size).toBe(16);
  });

  it('should assert correct control lines for R-Type instructions (e.g. ADD)', () => {
    const add = decodeInstruction(1); // ADD
    expect(add.mnemonic).toBe('ADD');
    expect(add.type).toBe('R');
    expect(add.signals.regWrite).toBe(true);
    expect(add.signals.memRead).toBe(false);
    expect(add.signals.memWrite).toBe(false);
    expect(add.signals.aluSrc).toBe(false);
    expect(add.signals.aluOpName).toBe('ADD');
    expect(add.signals.branch).toBe(false);
    expect(add.signals.jump).toBe(false);
  });

  it('should assert correct control lines for Memory instructions (LOAD and STORE)', () => {
    const load = decodeInstruction(8); // LOAD
    expect(load.mnemonic).toBe('LOAD');
    expect(load.signals.memRead).toBe(true);
    expect(load.signals.regWrite).toBe(true);
    expect(load.signals.memToReg).toBe(true);

    const store = decodeInstruction(9); // STORE
    expect(store.mnemonic).toBe('STORE');
    expect(store.signals.memWrite).toBe(true);
    expect(store.signals.regWrite).toBe(false);
  });

  it('should assert correct control lines for Branch and Jump instructions', () => {
    const beq = decodeInstruction(10); // BEQ
    expect(beq.signals.branch).toBe(true);
    expect(beq.signals.branchCondition).toBe('BEQ');
    expect(beq.signals.aluOpName).toBe('SUB');

    const jmp = decodeInstruction(12); // JMP
    expect(jmp.signals.jump).toBe(true);
    expect(jmp.signals.regWrite).toBe(false);
  });
});
