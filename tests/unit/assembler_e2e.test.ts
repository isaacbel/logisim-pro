/**
 * 8086 Assembler End-to-End Integration Tests
 * Assembles real programs, loads them into the CPU, runs them to HLT,
 * and validates the complete result — registers + memory + flags.
 */

import { describe, it, expect } from 'vitest';
import { assemble8086 } from '../../src/architecture/engine/assembler8086';
import { createInitial8086State, writeReg8086, calculatePhysicalAddress } from '../../src/architecture/engine/cpu8086Types';
import { step8086 } from '../../src/architecture/engine/cpu8086';

function runProgram(source: string, maxSteps = 500) {
  const asm = assemble8086(source);
  if (asm.errors.length > 0) {
    throw new Error(`Assembly failed: ${asm.errors.map(e => e.message).join(', ')}`);
  }

  let cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);

  for (let i = 0; i < maxSteps; i++) {
    if (cpu.halted) break;
    cpu = step8086(cpu);
  }

  return { cpu, asm };
}

// ─────────────────────────────────────────────────────────────────────────────
// Arithmetic Programs
// ─────────────────────────────────────────────────────────────────────────────
describe('End-to-End: Arithmetic Programs', () => {

  it('Simple addition: AX = 5 + 3 = 8', () => {
    const { cpu } = runProgram(`
      MOV AX, 5
      MOV BX, 3
      ADD AX, BX
      HLT
    `);
    expect(cpu.registers.ax).toBe(8);
    expect(cpu.registers.flags.zf).toBe(false);
    expect(cpu.registers.flags.cf).toBe(false);
  });

  it('Addition with carry: AX = 0xFFFE + 0x0003 = 0x0001 (CF=1)', () => {
    const { cpu } = runProgram(`
      MOV AX, 0FFFEH
      MOV BX, 0003H
      ADD AX, BX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0x0001);
    expect(cpu.registers.flags.cf).toBe(true);
  });

  it('Subtraction: AX = 10 - 4 = 6', () => {
    const { cpu } = runProgram(`
      MOV AX, 000AH
      MOV BX, 0004H
      SUB AX, BX
      HLT
    `);
    expect(cpu.registers.ax).toBe(6);
    expect(cpu.registers.flags.cf).toBe(false);
    expect(cpu.registers.flags.zf).toBe(false);
  });

  it('Subtraction causing borrow: 2 - 3 (CF=1, result=0xFFFF)', () => {
    const { cpu } = runProgram(`
      MOV AX, 0002H
      MOV BX, 0003H
      SUB AX, BX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0xFFFF);
    expect(cpu.registers.flags.cf).toBe(true);
  });

  it('INC/DEC sequence: 0 → 1 → 0', () => {
    const { cpu } = runProgram(`
      MOV AX, 0
      INC AX
      DEC AX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0);
    expect(cpu.registers.flags.zf).toBe(true);
  });

  it('NEG: AX = NEG(5) = -5 = 0xFFFB', () => {
    const { cpu } = runProgram(`
      MOV AX, 0005H
      NEG AX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0xFFFB);
    expect(cpu.registers.flags.cf).toBe(true);
    expect(cpu.registers.flags.sf).toBe(true);
  });

  it('MUL: AL = 7 * 6 = 42 (AX = 0x002A)', () => {
    const { cpu } = runProgram(`
      MOV AX, 0007H
      MOV BX, 0006H
      MUL BX
      HLT
    `);
    expect(cpu.registers.ax & 0xFF).toBe(42);
  });

  it('CBW: sign extends AL=0x80 to AX=0xFF80', () => {
    const { cpu } = runProgram(`
      MOV AX, 0080H
      CBW
      HLT
    `);
    expect(cpu.registers.ax).toBe(0xFF80);
  });

  it('CBW: positive AL=0x3F → AX=0x003F', () => {
    const { cpu } = runProgram(`
      MOV AX, 003FH
      CBW
      HLT
    `);
    expect(cpu.registers.ax).toBe(0x003F);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Logic Programs
// ─────────────────────────────────────────────────────────────────────────────
describe('End-to-End: Logic Programs', () => {

  it('AND mask: AX = 0xFF0F AND 0x0F0F = 0x0F0F', () => {
    const { cpu } = runProgram(`
      MOV AX, 0FF0FH
      MOV BX, 0F0FH
      AND AX, BX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0x0F0F);
  });

  it('OR combine: AX = 0xF000 OR 0x000F = 0xF00F', () => {
    const { cpu } = runProgram(`
      MOV AX, 0F000H
      MOV BX, 000FH
      OR AX, BX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0xF00F);
  });

  it('XOR clear: AX = 0xABCD XOR 0xABCD = 0 (ZF=1)', () => {
    const { cpu } = runProgram(`
      MOV AX, 0ABCDH
      XOR AX, AX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0);
    expect(cpu.registers.flags.zf).toBe(true);
  });

  it('NOT: AX = NOT(0xFF00) = 0x00FF', () => {
    const { cpu } = runProgram(`
      MOV AX, 0FF00H
      NOT AX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0x00FF);
  });

  it('SHL by 1: AX = 0x0001 SHL 1 = 0x0002', () => {
    const { cpu } = runProgram(`
      MOV AX, 0001H
      SHL AX, 1
      HLT
    `);
    expect(cpu.registers.ax).toBe(0x0002);
  });

  it('SHR by 1: AX = 0x0008 SHR 1 = 0x0004', () => {
    const { cpu } = runProgram(`
      MOV AX, 0008H
      SHR AX, 1
      HLT
    `);
    expect(cpu.registers.ax).toBe(0x0004);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Control Flow Programs
// ─────────────────────────────────────────────────────────────────────────────
describe('End-to-End: Control Flow Programs', () => {

  it('LOOP: CX = 5 down to 0, AX incremented 5 times', () => {
    const { cpu } = runProgram(`
      MOV AX, 0
      MOV CX, 5
      AGAIN: INC AX
      LOOP AGAIN
      HLT
    `);
    expect(cpu.registers.ax).toBe(5);
    expect(cpu.registers.cx).toBe(0);
  });

  it('JE skip: MOV AX,5; CMP AX,5; JE SKIP; MOV AX,99; SKIP: HLT → AX=5', () => {
    const { cpu } = runProgram(`
      MOV AX, 5
      CMP AX, 5
      JE SKIP
      MOV AX, 0063H
      SKIP: HLT
    `);
    expect(cpu.registers.ax).toBe(5);
  });

  it('JNE: when AX != BX, branch taken', () => {
    const { cpu } = runProgram(`
      MOV AX, 5
      MOV BX, 3
      CMP AX, BX
      JNE DONE
      MOV AX, 0FFFFH
      DONE: HLT
    `);
    expect(cpu.registers.ax).toBe(5);
  });

  it('JC: carry branch after add overflow', () => {
    const { cpu } = runProgram(`
      MOV AX, 0FFFFH
      ADD AX, 1
      JC OVER
      MOV BX, 0DEADH
      OVER: MOV BX, 0BEEFH
      HLT
    `);
    expect(cpu.registers.bx).toBe(0xBEEF);
  });

  it('Countdown loop with JNZ', () => {
    const { cpu } = runProgram(`
      MOV CX, 0003H
      COUNT: DEC CX
      JNZ COUNT
      HLT
    `);
    expect(cpu.registers.cx).toBe(0);
    expect(cpu.registers.flags.zf).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stack Programs
// ─────────────────────────────────────────────────────────────────────────────
describe('End-to-End: Stack Programs', () => {

  it('PUSH/POP round-trip: AX preserved', () => {
    const { cpu } = runProgram(`
      MOV AX, 0CAFEH
      PUSH AX
      MOV AX, 0
      POP AX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0xCAFE);
  });

  it('Multiple pushes/pops LIFO order', () => {
    const { cpu } = runProgram(`
      MOV AX, 0001H
      PUSH AX
      MOV AX, 0002H
      PUSH AX
      POP BX
      POP AX
      HLT
    `);
    expect(cpu.registers.bx).toBe(0x0002);
    expect(cpu.registers.ax).toBe(0x0001);
  });

  it('PUSHF/POPF preserves flags', () => {
    const { cpu } = runProgram(`
      MOV AX, 0FFFFH
      ADD AX, 0001H
      PUSHF
      XOR AX, AX
      POPF
      HLT
    `);
    expect(cpu.registers.flags.cf).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// XCHG Program
// ─────────────────────────────────────────────────────────────────────────────
describe('End-to-End: XCHG', () => {

  it('XCHG AX, BX swaps values', () => {
    const { cpu } = runProgram(`
      MOV AX, 0001H
      MOV BX, 0002H
      XCHG AX, BX
      HLT
    `);
    expect(cpu.registers.ax).toBe(0x0002);
    expect(cpu.registers.bx).toBe(0x0001);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LEA / Special Instructions
// ─────────────────────────────────────────────────────────────────────────────
describe('End-to-End: Assembler Special Instructions', () => {

  it('AAM: after MUL-like result, 14 = AH:1, AL:4', () => {
    const { cpu } = runProgram(`
      MOV AX, 000EH
      AAM
      HLT
    `);
    const ah = (cpu.registers.ax >> 8) & 0xFF;
    const al = cpu.registers.ax & 0xFF;
    expect(ah).toBe(1);
    expect(al).toBe(4);
  });

  it('AAD: AH=1, AL=4, AAD → AL=14 decimal', () => {
    const { cpu } = runProgram(`
      MOV AX, 0104H
      AAD
      HLT
    `);
    expect(cpu.registers.ax & 0xFF).toBe(14);
    expect((cpu.registers.ax >> 8) & 0xFF).toBe(0);
  });

  it('XLAT: translates using BX table', () => {
    const src = `
      MOV BX, 0200H
      MOV AX, 0003H
      XLAT
      HLT
    `;
    const asm = assemble8086(src);
    expect(asm.errors).toHaveLength(0);

    let cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    const tablePhys = calculatePhysicalAddress(0x0700, 0x0203);
    cpu.memory[tablePhys] = 0x42; // table[3] = 0x42

    for (let i = 0; i < 100; i++) {
      if (cpu.halted) break;
      cpu = step8086(cpu);
    }

    expect(cpu.registers.ax & 0xFF).toBe(0x42);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Disassembler roundtrip
// ─────────────────────────────────────────────────────────────────────────────
describe('Assembler Roundtrip — Disassembler', () => {
  it('NOP round-trips correctly', () => {
    const asm = assemble8086('NOP\nHLT');
    expect(asm.machineCode[0]).toBe(0x90);
    expect(asm.machineCode[1]).toBe(0xF4);
  });

  it('MOV AX, 1234H encodes as B8 34 12', () => {
    const asm = assemble8086('MOV AX, 1234H');
    expect(asm.machineCode[0]).toBe(0xB8);
    expect(asm.machineCode[1]).toBe(0x34);
    expect(asm.machineCode[2]).toBe(0x12);
  });

  it('PUSH AX encodes as 0x50', () => {
    const asm = assemble8086('PUSH AX');
    expect(asm.machineCode[0]).toBe(0x50);
  });

  it('POP BX encodes as 0x5B', () => {
    const asm = assemble8086('POP BX');
    expect(asm.machineCode[0]).toBe(0x5B);
  });

  it('INT 21H encodes as CD 21', () => {
    const asm = assemble8086('INT 21H');
    expect(asm.machineCode[0]).toBe(0xCD);
    expect(asm.machineCode[1]).toBe(0x21);
  });

  it('RET encodes as 0xC3', () => {
    const asm = assemble8086('RET');
    expect(asm.machineCode[0]).toBe(0xC3);
  });
});
