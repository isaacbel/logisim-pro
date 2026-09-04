import { describe, it, expect } from 'vitest';
import { assembleProgram, SAMPLE_PROGRAMS } from '@/architecture/engine/assembler';
import { createInitialCpuState, stepCpu, CpuState } from '@/architecture/engine/cpuEngine';

function runUntilHalt(programCode: string, maxSteps = 500): CpuState {
  const assembled = assembleProgram(programCode);
  if (!assembled.success) {
    throw new Error(`Assembly failed: ${assembled.errors.map(e => e.message).join(', ')}`);
  }
  let state = createInitialCpuState(assembled.machineCode);
  let steps = 0;
  while (!state.halted && steps < maxSteps) {
    state = stepCpu(state, assembled.machineCode);
    steps++;
  }
  return state;
}

describe('Computer Architecture Lab — Comprehensive CPU Program Executions', () => {
  it('Fibonacci: should compute first terms accurately into RAM', () => {
    const finalState = runUntilHalt(SAMPLE_PROGRAMS[0].code, 500);
    expect(finalState.halted).toBe(true);
    // RAM should contain Fibonacci terms: [0, 1, 1, 2, 3, 5, ...]
    expect(finalState.ram[0]).toBe(0);
    expect(finalState.ram[1]).toBe(1);
    expect(finalState.ram[2]).toBe(1);
  });

  it('Sum 1..N: should calculate 1+2+3+4+5 = 15', () => {
    const code = `
      ADDI R1, R0, 5     ; N = 5
      ADDI R2, R0, 0     ; Sum = 0
      ADDI R3, R0, 1     ; Step = 1

LOOP: ADD  R2, R2, R1    ; Sum += N
      SUB  R1, R1, R3    ; N--
      BNE  R1, R0, LOOP  ; if (N != 0) goto LOOP
      STORE R2, [0]      ; RAM[0] = 15
      HALT
    `;
    const finalState = runUntilHalt(code);
    expect(finalState.halted).toBe(true);
    expect(finalState.ram[0]).toBe(15);
  });

  it('Max(A, B): should select B when B > A', () => {
    const code = `
      ADDI R1, R0, 15    ; A = 15
      ADDI R2, R0, 45    ; B = 45
      SUB  R3, R1, R2    ; R3 = 15 - 45
      BEQ  R3, R0, END
      SUB  R4, R2, R1    ; R4 = 45 - 15
      ADDI R1, R2, 0     ; R1 = 45
END:  STORE R1, [0]
      HALT
    `;
    const finalState = runUntilHalt(code);
    expect(finalState.halted).toBe(true);
    expect(finalState.ram[0]).toBe(45);
  });

  it('Multiply: 6 x 7 should produce 42 in RAM[0]', () => {
    const code = `
      ADDI R1, R0, 6     ; A = 6
      ADDI R2, R0, 7     ; B = 7
      ADDI R3, R0, 1     ; Step = 1
      ADDI R4, R0, 0     ; Prod = 0

MULT: BEQ  R2, R0, DONE
      ADD  R4, R4, R1
      SUB  R2, R2, R3
      JMP  MULT
DONE: STORE R4, [0]
      HALT
    `;
    const finalState = runUntilHalt(code);
    expect(finalState.halted).toBe(true);
    expect(finalState.ram[0]).toBe(42);
  });

  it('Logical operations: AND, OR, XOR chain execution', () => {
    const code = `
      ADDI R1, R0, 0x0F  ; 15 (0000 1111)
      ADDI R2, R0, 0x30  ; 48 (0011 0000)
      OR   R3, R1, R2    ; R3 = 0x3F (63)
      AND  R4, R3, R1    ; R4 = 0x0F (15)
      XOR  R5, R4, R1    ; R5 = 0x00
      STORE R5, [0]
      HALT
    `;
    const finalState = runUntilHalt(code);
    expect(finalState.halted).toBe(true);
    expect(finalState.ram[0]).toBe(0);
    expect(finalState.registers[3]).toBe(0x3F);
    expect(finalState.registers[4]).toBe(0x0F);
  });

  it('Shift operations: SHL and SHR execution in CPU loop', () => {
    const code = `
      ADDI R1, R0, 3     ; R1 = 3
      SHL  R1, R1        ; R1 = 6
      SHL  R1, R1        ; R1 = 12
      SHR  R1, R1        ; R1 = 6
      STORE R1, [0]
      HALT
    `;
    const finalState = runUntilHalt(code);
    expect(finalState.halted).toBe(true);
    expect(finalState.ram[0]).toBe(6);
  });
});
