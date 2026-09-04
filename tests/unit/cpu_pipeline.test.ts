import { describe, it, expect } from 'vitest';
import { assembleProgram, SAMPLE_PROGRAMS } from '@/architecture/engine/assembler';
import { createInitialCpuState, stepCpu, CpuState } from '@/architecture/engine/cpuEngine';

describe('Computer Architecture Lab — CPU Execution & Pipeline Engine', () => {
  it('should step single instructions and update PC, IR, and Registers', () => {
    // Program:
    // ADDI R1, R0, 10
    // ADDI R2, R0, 20
    // ADD  R3, R1, R2
    // HALT
    const code = `
      ADDI R1, R0, 10
      ADDI R2, R0, 20
      ADD  R3, R1, R2
      HALT
    `;
    const prog = assembleProgram(code);
    expect(prog.success).toBe(true);

    let state = createInitialCpuState(prog.machineCode);
    expect(state.pc).toBe(0);
    expect(state.registers[1]).toBe(0);

    // Step 1: ADDI R1, R0, 10
    state = stepCpu(state, prog.machineCode);
    expect(state.registers[1]).toBe(10);
    expect(state.pc).toBe(1);

    // Step 2: ADDI R2, R0, 20
    state = stepCpu(state, prog.machineCode);
    expect(state.registers[2]).toBe(20);
    expect(state.pc).toBe(2);

    // Step 3: ADD R3, R1, R2
    state = stepCpu(state, prog.machineCode);
    expect(state.registers[3]).toBe(30);
    expect(state.pc).toBe(3);

    // Step 4: HALT
    state = stepCpu(state, prog.machineCode);
    expect(state.halted).toBe(true);
  });

  it('should execute the Sum 1..N program and write 55 into RAM[0]', () => {
    // Program 2 in SAMPLE_PROGRAMS is Sum 1..N (N=10 -> Sum=55)
    const sumProg = SAMPLE_PROGRAMS[1];
    const assembled = assembleProgram(sumProg.code);
    expect(assembled.success).toBe(true);

    let state = createInitialCpuState(assembled.machineCode);

    // Run until halt or max 200 cycles
    let maxCycles = 200;
    while (!state.halted && maxCycles-- > 0) {
      state = stepCpu(state, assembled.machineCode);
    }

    expect(state.halted).toBe(true);
    // Sum of 1..10 is 55 (0x37)
    expect(state.ram[0]).toBe(55);
  });

  it('should execute the Multiplication program (6 x 7 = 42) and store in RAM[0]', () => {
    // Program 4 in SAMPLE_PROGRAMS: 6 * 7 = 42
    const multProg = SAMPLE_PROGRAMS[3];
    const assembled = assembleProgram(multProg.code);
    expect(assembled.success).toBe(true);

    let state = createInitialCpuState(assembled.machineCode);
    let maxCycles = 200;
    while (!state.halted && maxCycles-- > 0) {
      state = stepCpu(state, assembled.machineCode);
    }

    expect(state.halted).toBe(true);
    expect(state.ram[0]).toBe(42);
  });

  it('should track all 5 pipeline stages details accurately', () => {
    const prog = assembleProgram('ADDI R1, R0, 5\nHALT');
    let state = createInitialCpuState(prog.machineCode);
    state = stepCpu(state, prog.machineCode);

    expect(state.stageDetails.IF).toContain('PC=');
    expect(state.stageDetails.ID).toContain('ADDI');
    expect(state.stageDetails.EX).toContain('ALU');
    expect(state.stageDetails.WB).toContain('R1');
  });
});
