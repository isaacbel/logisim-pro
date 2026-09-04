/**
 * 8086 Conditional Branch Instruction Tests
 * Verifies all 30 conditional jump opcodes assemble correctly and
 * the CPU executes them correctly based on flag state.
 */

import { describe, it, expect } from 'vitest';
import { assemble8086 } from '../../src/architecture/engine/assembler8086';
import {
  createInitial8086State,
  Flags8086,
} from '../../src/architecture/engine/cpu8086Types';
import { step8086 } from '../../src/architecture/engine/cpu8086';

// ─────────────────────────────────────────────────────────────────────────────
// Assembler jump encoding tests
// ─────────────────────────────────────────────────────────────────────────────
describe('Assembler — All Conditional Jump Encodings', () => {
  const jumpTable: [string, number][] = [
    ['JO',   0x70],
    ['JNO',  0x71],
    ['JB',   0x72],
    ['JC',   0x72],
    ['JNB',  0x73],
    ['JAE',  0x73],
    ['JNC',  0x73],
    ['JE',   0x74],
    ['JZ',   0x74],
    ['JNE',  0x75],
    ['JNZ',  0x75],
    ['JBE',  0x76],
    ['JNA',  0x76],
    ['JA',   0x77],
    ['JNBE', 0x77],
    ['JS',   0x78],
    ['JNS',  0x79],
    ['JP',   0x7A],
    ['JPE',  0x7A],
    ['JNP',  0x7B],
    ['JPO',  0x7B],
    ['JL',   0x7C],
    ['JNGE', 0x7C],
    ['JGE',  0x7D],
    ['JNL',  0x7D],
    ['JLE',  0x7E],
    ['JNG',  0x7E],
    ['JG',   0x7F],
    ['JNLE', 0x7F],
    ['LOOP', 0xE2],
    ['LOOPE', 0xE1],
    ['LOOPNE', 0xE0],
    ['JCXZ', 0xE3],
  ];

  for (const [mnemonic, opcode] of jumpTable) {
    it(`${mnemonic} encodes as 0x${opcode.toString(16).toUpperCase()}`, () => {
      const src = `
        JMP DONE
        ${mnemonic} DONE
        DONE: NOP
      `;
      const result = assemble8086(src);
      expect(result.errors).toHaveLength(0);
      const code = result.machineCode;
      expect(code[2]).toBe(opcode);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CPU Execution: Conditional branches taken/not-taken
// ─────────────────────────────────────────────────────────────────────────────
describe('CPU — Conditional Branch Execution', () => {

  function runWithFlags(mnemonic: string, flagOverrides: Partial<Flags8086>) {
    const src = `
      ${mnemonic} TARGET
      NOP
      TARGET: NOP
    `;
    const asmResult = assemble8086(src);
    expect(asmResult.errors, `Assembly error for ${mnemonic}`).toHaveLength(0);

    let cpu = createInitial8086State(asmResult.machineCode, 0x0700, 0x0100);
    Object.assign(cpu.registers.flags, flagOverrides);

    cpu = step8086(cpu);
    return cpu.registers.ip;
  }

  const BASE = 0x100;
  const JUMP_SIZE = 2;
  const NOP_SIZE = 1;

  it('JE taken when ZF=1 → skips NOP after jump', () => {
    const ip = runWithFlags('JE', { zf: true });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JE not taken when ZF=0 → falls through', () => {
    const ip = runWithFlags('JE', { zf: false });
    expect(ip).toBe(BASE + JUMP_SIZE);
  });

  it('JNE taken when ZF=0', () => {
    const ip = runWithFlags('JNE', { zf: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JNE not taken when ZF=1', () => {
    const ip = runWithFlags('JNE', { zf: true });
    expect(ip).toBe(BASE + JUMP_SIZE);
  });

  it('JC taken when CF=1', () => {
    const ip = runWithFlags('JC', { cf: true });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JNC taken when CF=0', () => {
    const ip = runWithFlags('JNC', { cf: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JS taken when SF=1', () => {
    const ip = runWithFlags('JS', { sf: true });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JNS taken when SF=0', () => {
    const ip = runWithFlags('JNS', { sf: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JO taken when OF=1', () => {
    const ip = runWithFlags('JO', { of: true });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JNO taken when OF=0', () => {
    const ip = runWithFlags('JNO', { of: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JL taken when SF != OF', () => {
    const ip = runWithFlags('JL', { sf: true, of: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JL not taken when SF == OF', () => {
    const ip = runWithFlags('JL', { sf: true, of: true });
    expect(ip).toBe(BASE + JUMP_SIZE);
  });

  it('JGE taken when SF == OF', () => {
    const ip = runWithFlags('JGE', { sf: false, of: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JLE taken when ZF=1', () => {
    const ip = runWithFlags('JLE', { zf: true, sf: false, of: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JLE taken when SF != OF', () => {
    const ip = runWithFlags('JLE', { zf: false, sf: true, of: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JG taken when ZF=0 and SF==OF', () => {
    const ip = runWithFlags('JG', { zf: false, sf: true, of: true });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JG not taken when ZF=1', () => {
    const ip = runWithFlags('JG', { zf: true, sf: false, of: false });
    expect(ip).toBe(BASE + JUMP_SIZE);
  });

  it('JA taken when CF=0 and ZF=0', () => {
    const ip = runWithFlags('JA', { cf: false, zf: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JA not taken when CF=1', () => {
    const ip = runWithFlags('JA', { cf: true, zf: false });
    expect(ip).toBe(BASE + JUMP_SIZE);
  });

  it('JBE taken when CF=1', () => {
    const ip = runWithFlags('JBE', { cf: true, zf: false });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });

  it('JBE taken when ZF=1', () => {
    const ip = runWithFlags('JBE', { cf: false, zf: true });
    expect(ip).toBe(BASE + JUMP_SIZE + NOP_SIZE);
  });
});
