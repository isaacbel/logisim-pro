import { describe, it, expect } from 'vitest';
import { createInitialCpuState, stepCpu } from '@/architecture/engine/cpuEngine';
import { assembleProgram } from '@/architecture/engine/assembler';
import { decodeInstruction } from '@/architecture/engine/controlUnitEngine';

describe('Computer Architecture Lab — Datapath Hardware Simulation & Signal Flow', () => {
  it('IF Stage: PC increments sequentially by 1 on standard non-branch instructions', () => {
    const code = 'NOP\nNOP\nNOP\nHALT';
    const prog = assembleProgram(code);
    let state = createInitialCpuState(prog.machineCode);

    expect(state.pc).toBe(0);
    state = stepCpu(state, prog.machineCode);
    expect(state.pc).toBe(1);
    state = stepCpu(state, prog.machineCode);
    expect(state.pc).toBe(2);
  });

  it('ID Stage: correctly decodes R-type registers and control lines', () => {
    const code = 'ADD R3, R1, R2\nHALT';
    const prog = assembleProgram(code);
    const state = createInitialCpuState(prog.machineCode);

    const decoded = decodeInstruction((state.ir >> 12) & 0x0F);
    expect(decoded.mnemonic).toBe('ADD');
    expect(decoded.signals.regWrite).toBe(true);
    expect(decoded.signals.aluSrc).toBe(false);
  });

  it('EX Stage: executes arithmetic and updates condition flags', () => {
    // SUB R3, R1, R1 -> Zero Flag asserted
    const code = 'ADDI R1, R0, 5\nSUB R3, R1, R1\nHALT';
    const prog = assembleProgram(code);
    let state = createInitialCpuState(prog.machineCode);

    state = stepCpu(state, prog.machineCode); // ADDI
    state = stepCpu(state, prog.machineCode); // SUB
    expect(state.flags.zero).toBe(true);
    expect(state.registers[3]).toBe(0);
  });

  it('MEM Stage: STORE writes register data to designated RAM address', () => {
    const code = 'ADDI R1, R0, 42\nSTORE R1, [5]\nHALT';
    const prog = assembleProgram(code);
    let state = createInitialCpuState(prog.machineCode);

    state = stepCpu(state, prog.machineCode); // ADDI
    state = stepCpu(state, prog.machineCode); // STORE
    expect(state.ram[5]).toBe(42);
  });

  it('MEM Stage: LOAD retrieves data from RAM into destination register', () => {
    const code = 'ADDI R1, R0, 42\nSTORE R1, [3]\nLOAD R2, [3]\nHALT';
    const prog = assembleProgram(code);
    let state = createInitialCpuState(prog.machineCode);

    state = stepCpu(state, prog.machineCode); // ADDI
    state = stepCpu(state, prog.machineCode); // STORE
    state = stepCpu(state, prog.machineCode); // LOAD
    expect(state.registers[2]).toBe(42);
  });

  it('Branch Taken: BEQ jumps to target address when condition matches', () => {
    const code = `
      ADDI R1, R0, 5
      ADDI R2, R0, 5
      BEQ  R1, R2, TARGET
      NOP
      NOP
TARGET: ADDI R3, R0, 77
      HALT
    `;
    const prog = assembleProgram(code);
    let state = createInitialCpuState(prog.machineCode);

    state = stepCpu(state, prog.machineCode); // ADDI R1
    state = stepCpu(state, prog.machineCode); // ADDI R2
    state = stepCpu(state, prog.machineCode); // BEQ (Branch Taken!)
    expect(state.pc).toBe(prog.symbolTable['TARGET']);
  });

  it('Branch Not Taken: BEQ falls through when condition is false', () => {
    const code = `
      ADDI R1, R0, 5
      ADDI R2, R0, 10
      BEQ  R1, R2, TARGET
      ADDI R3, R0, 11
TARGET: HALT
    `;
    const prog = assembleProgram(code);
    let state = createInitialCpuState(prog.machineCode);

    state = stepCpu(state, prog.machineCode); // ADDI R1
    state = stepCpu(state, prog.machineCode); // ADDI R2
    state = stepCpu(state, prog.machineCode); // BEQ (Not Taken, falls to ADDI R3)
    expect(state.pc).toBe(3);
  });

  it('Jump: JMP unconditionally sets PC to target address', () => {
    const code = `
      JMP SKIP
      NOP
      NOP
SKIP: ADDI R1, R0, 123
      HALT
    `;
    const prog = assembleProgram(code);
    let state = createInitialCpuState(prog.machineCode);

    state = stepCpu(state, prog.machineCode); // JMP
    expect(state.pc).toBe(prog.symbolTable['SKIP']);
  });
});
