import { describe, it, expect } from 'vitest';
import {
  createInitial8086State,
  readReg8086,
  writeReg8086,
  readMem16,
  writeMem16,
  getPhysicalAddress,
} from '../../src/architecture/engine/cpu8086Types';
import { step8086, run8086UntilHalt } from '../../src/architecture/engine/cpu8086';
import { assemble8086 } from '../../src/architecture/engine/assembler8086';

describe('8086 CPU Execution Engine', () => {
  describe('State and Physical Memory Math', () => {
    it('calculates physical addresses correctly using (Seg * 16) + Offset', () => {
      expect(getPhysicalAddress(0x0700, 0x0100)).toBe(0x07100);
      expect(getPhysicalAddress(0xFFFF, 0x0010)).toBe(0x00000); // 20-bit wrap
      expect(getPhysicalAddress(0x1000, 0x0005)).toBe(0x10005);
    });

    it('synchronizes 16-bit AX with AH and AL', () => {
      const state = createInitial8086State();
      writeReg8086(state, 'AX', 0x1234);
      expect(readReg8086(state, 'AH')).toBe(0x12);
      expect(readReg8086(state, 'AL')).toBe(0x34);

      // Modify AL only
      writeReg8086(state, 'AL', 0x78);
      expect(readReg8086(state, 'AX')).toBe(0x1278);
      expect(readReg8086(state, 'AH')).toBe(0x12);

      // Modify AH only
      writeReg8086(state, 'AH', 0xAB);
      expect(readReg8086(state, 'AX')).toBe(0xAB78);
    });

    it('writes and reads 16-bit words in little-endian order', () => {
      const state = createInitial8086State();
      writeMem16(state, 0x1000, 0x1234);
      expect(state.memory[0x1000]).toBe(0x34); // Low byte
      expect(state.memory[0x1001]).toBe(0x12); // High byte
      expect(readMem16(state, 0x1000)).toBe(0x1234);
    });
  });

  describe('Instruction Execution', () => {
    it('executes MOV AX, imm and HLT', () => {
      const asm = assemble8086('MOV AX, 1234H\nHLT');
      expect(asm.success).toBe(true);

      const cpu = createInitial8086State(asm.machineCode);
      const cycles = run8086UntilHalt(cpu);
      expect(cpu.halted).toBe(true);
      expect(cpu.registers.ax).toBe(0x1234);
      expect(cycles).toBeGreaterThan(0);
    });

    it('executes ADD AX, BX and CMP', () => {
      const code = `
        MOV AX, 0005H
        MOV BX, 0003H
        ADD AX, BX
        HLT
      `;
      const asm = assemble8086(code);
      const cpu = createInitial8086State(asm.machineCode);
      run8086UntilHalt(cpu);
      expect(cpu.registers.ax).toBe(0x0008);
      expect(cpu.registers.bx).toBe(0x0003);
      expect(cpu.registers.flags.zf).toBe(false);
    });

    it('executes LOOP instruction countdown', () => {
      const code = `
        MOV CX, 0005H
        MOV AX, 0000H
      LOOP_TOP:
        INC AX
        LOOP LOOP_TOP
        HLT
      `;
      const asm = assemble8086(code);
      expect(asm.success).toBe(true);

      const cpu = createInitial8086State(asm.machineCode);
      run8086UntilHalt(cpu);
      expect(cpu.registers.ax).toBe(0x0005);
      expect(cpu.registers.cx).toBe(0x0000);
      expect(cpu.halted).toBe(true);
    });

    it('executes conditional jumps JE and JNE', () => {
      const code = `
        MOV AX, 0005H
        MOV BX, 0005H
        CMP AX, BX
        JE EQUAL_LABEL
        MOV CX, 0000H
        HLT
      EQUAL_LABEL:
        MOV CX, 0001H
        HLT
      `;
      const asm = assemble8086(code);
      const cpu = createInitial8086State(asm.machineCode);
      run8086UntilHalt(cpu);
      expect(cpu.registers.cx).toBe(0x0001);
    });

    it('executes stack operations PUSH and POP', () => {
      const code = `
        MOV AX, 1234H
        PUSH AX
        MOV AX, 0000H
        POP BX
        HLT
      `;
      const asm = assemble8086(code);
      const cpu = createInitial8086State(asm.machineCode);
      const initialSp = cpu.registers.sp;

      run8086UntilHalt(cpu);
      expect(cpu.registers.bx).toBe(0x1234);
      expect(cpu.registers.sp).toBe(initialSp); // SP restored
    });

    it('executes procedure CALL and RET', () => {
      const code = `
        MOV AX, 0003H
        CALL DOUBLE_PROC
        HLT
      DOUBLE_PROC:
        SHL AX, 1
        RET
      `;
      const asm = assemble8086(code);
      const cpu = createInitial8086State(asm.machineCode);
      run8086UntilHalt(cpu);
      expect(cpu.registers.ax).toBe(0x0006);
    });
  });
});
