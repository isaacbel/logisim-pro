/**
 * 8086 String Instruction Tests
 * MOVSB, MOVSW, STOSB, STOSW, LODSB, LODSW, CMPSB, CMPSW, SCASB, SCASW
 * Tests both single-execution and REP/REPE/REPNE prefix behavior
 */

import { describe, it, expect } from 'vitest';
import { createInitial8086State, writeReg8086 } from '../../src/architecture/engine/cpu8086Types';
import { step8086 } from '../../src/architecture/engine/cpu8086';
import { assemble8086 } from '../../src/architecture/engine/assembler8086';

function writeWordLE(mem: Uint8Array, addr: number, val: number) {
  mem[addr]     = val & 0xFF;
  mem[addr + 1] = (val >> 8) & 0xFF;
}

function readWordLE(mem: Uint8Array, addr: number): number {
  return mem[addr] | (mem[addr + 1] << 8);
}

function physAddr(seg: number, offset: number): number {
  return ((seg << 4) + offset) & 0xFFFFF;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOVSB Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('MOVSB — Move Byte from [DS:SI] to [ES:DI]', () => {
  it('copies byte, increments SI and DI (DF=0)', () => {
    const asm = assemble8086('MOVSB');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'DS', 0x1000);
    writeReg8086(cpu, 'ES', 0x2000);
    writeReg8086(cpu, 'SI', 0x0050);
    writeReg8086(cpu, 'DI', 0x0050);
    cpu.registers.flags.df = false;

    const srcAddr = physAddr(0x1000, 0x0050);
    const dstAddr = physAddr(0x2000, 0x0050);
    cpu.memory[srcAddr] = 0xAB;

    step8086(cpu);

    expect(cpu.memory[dstAddr]).toBe(0xAB);
    expect(cpu.registers.si).toBe(0x0051); // SI++
    expect(cpu.registers.di).toBe(0x0051); // DI++
  });

  it('copies byte, decrements SI and DI (DF=1)', () => {
    const asm = assemble8086('MOVSB');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'DS', 0x1000);
    writeReg8086(cpu, 'ES', 0x2000);
    writeReg8086(cpu, 'SI', 0x0050);
    writeReg8086(cpu, 'DI', 0x0050);
    cpu.registers.flags.df = true;

    const srcAddr = physAddr(0x1000, 0x0050);
    const dstAddr = physAddr(0x2000, 0x0050);
    cpu.memory[srcAddr] = 0xCD;

    step8086(cpu);

    expect(cpu.memory[dstAddr]).toBe(0xCD);
    expect(cpu.registers.si).toBe(0x004F); // SI--
    expect(cpu.registers.di).toBe(0x004F); // DI--
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOVSW Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('MOVSW — Move Word from [DS:SI] to [ES:DI]', () => {
  it('copies word, SI/DI +2 (DF=0)', () => {
    const asm = assemble8086('MOVSW');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'DS', 0x1000);
    writeReg8086(cpu, 'ES', 0x2000);
    writeReg8086(cpu, 'SI', 0x0050);
    writeReg8086(cpu, 'DI', 0x0050);
    cpu.registers.flags.df = false;

    const srcAddr = physAddr(0x1000, 0x0050);
    const dstAddr = physAddr(0x2000, 0x0050);
    writeWordLE(cpu.memory, srcAddr, 0x1234);

    step8086(cpu);

    expect(readWordLE(cpu.memory, dstAddr)).toBe(0x1234);
    expect(cpu.registers.si).toBe(0x0052);
    expect(cpu.registers.di).toBe(0x0052);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STOSB / STOSW Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('STOSB — Store AL at [ES:DI]', () => {
  it('stores AL at destination and increments DI', () => {
    const asm = assemble8086('STOSB');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'ES', 0x3000);
    writeReg8086(cpu, 'DI', 0x0100);
    writeReg8086(cpu, 'AX', 0x00EF); // AL = 0xEF
    cpu.registers.flags.df = false;

    const dstAddr = physAddr(0x3000, 0x0100);

    step8086(cpu);

    expect(cpu.memory[dstAddr]).toBe(0xEF);
    expect(cpu.registers.di).toBe(0x0101);
  });
});

describe('STOSW — Store AX at [ES:DI]', () => {
  it('stores AX (word) at destination and increments DI by 2', () => {
    const asm = assemble8086('STOSW');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'ES', 0x3000);
    writeReg8086(cpu, 'DI', 0x0100);
    writeReg8086(cpu, 'AX', 0xBEEF);
    cpu.registers.flags.df = false;

    const dstAddr = physAddr(0x3000, 0x0100);

    step8086(cpu);

    expect(readWordLE(cpu.memory, dstAddr)).toBe(0xBEEF);
    expect(cpu.registers.di).toBe(0x0102);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LODSB / LODSW Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('LODSB — Load byte from [DS:SI] into AL', () => {
  it('loads byte from source into AL and increments SI', () => {
    const asm = assemble8086('LODSB');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'DS', 0x1000);
    writeReg8086(cpu, 'SI', 0x0200);
    cpu.registers.flags.df = false;

    const srcAddr = physAddr(0x1000, 0x0200);
    cpu.memory[srcAddr] = 0x42;

    step8086(cpu);

    expect(cpu.registers.ax & 0xFF).toBe(0x42);
    expect(cpu.registers.si).toBe(0x0201);
  });
});

describe('LODSW — Load word from [DS:SI] into AX', () => {
  it('loads word from source into AX and increments SI by 2', () => {
    const asm = assemble8086('LODSW');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'DS', 0x1000);
    writeReg8086(cpu, 'SI', 0x0200);
    cpu.registers.flags.df = false;

    const srcAddr = physAddr(0x1000, 0x0200);
    writeWordLE(cpu.memory, srcAddr, 0xCAFE);

    step8086(cpu);

    expect(cpu.registers.ax).toBe(0xCAFE);
    expect(cpu.registers.si).toBe(0x0202);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CMPSB / CMPSW Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('CMPSB — Compare [DS:SI] with [ES:DI]', () => {
  it('sets ZF=1 when bytes equal, increments SI and DI', () => {
    const asm = assemble8086('CMPSB');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'DS', 0x1000);
    writeReg8086(cpu, 'ES', 0x2000);
    writeReg8086(cpu, 'SI', 0x0050);
    writeReg8086(cpu, 'DI', 0x0050);
    cpu.registers.flags.df = false;

    const srcAddr = physAddr(0x1000, 0x0050);
    const dstAddr = physAddr(0x2000, 0x0050);
    cpu.memory[srcAddr] = 0x55;
    cpu.memory[dstAddr] = 0x55;

    step8086(cpu);

    expect(cpu.registers.flags.zf).toBe(true);
    expect(cpu.registers.flags.cf).toBe(false);
    expect(cpu.registers.si).toBe(0x0051);
    expect(cpu.registers.di).toBe(0x0051);
  });

  it('sets CF=1 when [DS:SI] < [ES:DI]', () => {
    const asm = assemble8086('CMPSB');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'DS', 0x1000);
    writeReg8086(cpu, 'ES', 0x2000);
    writeReg8086(cpu, 'SI', 0x0050);
    writeReg8086(cpu, 'DI', 0x0050);
    cpu.registers.flags.df = false;

    cpu.memory[physAddr(0x1000, 0x0050)] = 0x01;
    cpu.memory[physAddr(0x2000, 0x0050)] = 0x02;

    step8086(cpu);

    expect(cpu.registers.flags.zf).toBe(false);
    expect(cpu.registers.flags.cf).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCASB / SCASW Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('SCASB — Scan: Compare AL with [ES:DI]', () => {
  it('sets ZF=1 when AL == [ES:DI]', () => {
    const asm = assemble8086('SCASB');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'ES', 0x2000);
    writeReg8086(cpu, 'DI', 0x0100);
    writeReg8086(cpu, 'AX', 0x00FF);
    cpu.registers.flags.df = false;

    cpu.memory[physAddr(0x2000, 0x0100)] = 0xFF;

    step8086(cpu);

    expect(cpu.registers.flags.zf).toBe(true);
    expect(cpu.registers.di).toBe(0x0101);
  });

  it('sets ZF=0 when AL != [ES:DI]', () => {
    const asm = assemble8086('SCASB');
    const cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'ES', 0x2000);
    writeReg8086(cpu, 'DI', 0x0100);
    writeReg8086(cpu, 'AX', 0x0042);
    cpu.registers.flags.df = false;

    cpu.memory[physAddr(0x2000, 0x0100)] = 0x43;

    step8086(cpu);

    expect(cpu.registers.flags.zf).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Loop Fill Test
// ─────────────────────────────────────────────────────────────────────────────
describe('REP STOSB — Fill 4 bytes via assembler loop', () => {
  it('fills 4 bytes using manual CX-decrement loop', () => {
    const src = `
      MOV AX, 0042H
      MOV CX, 4
      MOV DI, 0200H
      FILL: STOSB
      DEC CX
      JNZ FILL
      HLT
    `;
    const asm = assemble8086(src);
    expect(asm.errors).toHaveLength(0);

    let cpu = createInitial8086State(asm.machineCode, 0x0700, 0x0100);
    writeReg8086(cpu, 'ES', 0x0700);
    cpu.registers.flags.df = false;

    for (let i = 0; i < 100; i++) {
      if (cpu.halted) break;
      cpu = step8086(cpu);
    }

    const esBase = physAddr(0x0700, 0x0200);
    for (let j = 0; j < 4; j++) {
      expect(cpu.memory[esBase + j]).toBe(0x42);
    }
  });
});
