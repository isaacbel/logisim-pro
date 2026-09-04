/**
 * Intel 8086 Centralized Single-Source-of-Truth Store (Zustand)
 * All 8086 laboratories (Register Lab, ALU, Datapath, BIU/Queue, Memory, Stack, Debugger, Trace, Timing)
 * subscribe to and mutate this authoritative live CPU state.
 */
import { create } from 'zustand';
import {
  CPU8086State,
  Flags8086,
  createInitial8086State,
  writeReg8086,
  writeMem16,
} from '../architecture/engine/cpu8086Types';
import { step8086, run8086, pushStack, popStack } from '../architecture/engine/cpu8086';
import { assemble8086 } from '../architecture/engine/assembler8086';
import { executeAlu8086, Alu8086Op } from '../architecture/engine/alu8086';

export interface Cpu8086Store {
  // Live CPU State
  cpu: CPU8086State;
  sourceCode: string;
  assembledHex: string;
  assemblyErrors: string[];
  isRunning: boolean;

  // Actions
  step: () => void;
  run: (maxSteps?: number) => { hitBreakpoint: boolean };
  stop: () => void;
  reset: () => void;
  loadProgram: (machineBytes: number[], loadSegment?: number, loadOffset?: number) => void;
  assembleAndLoad: (source: string) => boolean;
  setRegister: (regName: string, val: number) => void;
  setFlag: (flagName: keyof Flags8086, val: boolean) => void;
  setMemoryByte: (physAddr: number, val: number) => void;
  setMemoryWord: (physAddr: number, val: number) => void;
  setSourceCode: (code: string) => void;
  toggleBreakpoint: (addr: number) => void;
  setConditionalBreakpoint: (addr: number, cond: string) => void;
  clearTrace: () => void;
  executeAluDirect: (op: Alu8086Op, valB: number, is16Bit: boolean) => void;
  pushStackDirect: (val: number) => void;
  popStackDirect: () => number;
  inPortDirect: (port: number) => number;
  outPortDirect: (port: number, val: number) => void;
}

const DEFAULT_PROGRAM = `; Intel 8086 Assembly Program
MOV AX, 0005H     ; AX = 5
MOV BX, 0003H     ; BX = 3
ADD AX, BX        ; AX = AX + BX = 8
PUSH AX           ; Push result onto stack
POP DX            ; DX = 8
HLT               ; Halt
`;

function cloneCpuState(state: CPU8086State): CPU8086State {
  const newMem = new Uint8Array(state.memory.length);
  newMem.set(state.memory);

  const newIo = new Uint8Array(state.ioPorts.length);
  newIo.set(state.ioPorts);

  return {
    registers: {
      ...state.registers,
      flags: { ...state.registers.flags },
    },
    memory: newMem,
    queue: [...state.queue],
    halted: state.halted,
    running: state.running,
    cycles: state.cycles,
    instructionsExecuted: state.instructionsExecuted,
    currentOpcode: state.currentOpcode,
    currentDisassembly: state.currentDisassembly,
    currentPhysicalAddress: state.currentPhysicalAddress,
    busCycle: { ...state.busCycle },
    ioPorts: newIo,
    virtualIo: { ...state.virtualIo },
    breakpoints: new Set(state.breakpoints),
    conditionalBreakpoints: new Map(state.conditionalBreakpoints),
    watchExpressions: [...state.watchExpressions],
    trace: [...state.trace],
    microOpDescription: state.microOpDescription,
  };
}

export const useCpu8086Store = create<Cpu8086Store>((set, get) => {
  const initialAsm = assemble8086(DEFAULT_PROGRAM);
  const initialCpu = createInitial8086State(initialAsm.machineCode);

  return {
    cpu: initialCpu,
    sourceCode: DEFAULT_PROGRAM,
    assembledHex: initialAsm.machineCode.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
    assemblyErrors: [],
    isRunning: false,

    step: () => {
      const { cpu } = get();
      if (cpu.halted) return;
      const next = cloneCpuState(cpu);
      step8086(next);
      set({ cpu: next });
    },

    run: (maxSteps = 5000) => {
      const { cpu } = get();
      if (cpu.halted) return { hitBreakpoint: false };
      const next = cloneCpuState(cpu);
      set({ isRunning: true });
      const result = run8086(next, maxSteps);
      set({ cpu: result.state, isRunning: false });
      return { hitBreakpoint: result.hitBreakpoint };
    },

    stop: () => set({ isRunning: false }),

    reset: () => {
      const { sourceCode } = get();
      const asm = assemble8086(sourceCode);
      const newCpu = createInitial8086State(asm.machineCode);
      set({
        cpu: newCpu,
        assembledHex: asm.machineCode.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
        assemblyErrors: asm.errors.map(e => `Line ${e.line}: ${e.message}`),
        isRunning: false,
      });
    },

    loadProgram: (machineBytes, loadSegment = 0x0700, loadOffset = 0x0100) => {
      const newCpu = createInitial8086State(machineBytes, loadSegment, loadOffset);
      set({
        cpu: newCpu,
        assembledHex: machineBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
        isRunning: false,
      });
    },

    assembleAndLoad: (source) => {
      const asm = assemble8086(source);
      if (!asm.success) {
        set({
          sourceCode: source,
          assemblyErrors: asm.errors.map(e => `Line ${e.line}: ${e.message}`),
        });
        return false;
      }
      const newCpu = createInitial8086State(asm.machineCode);
      set({
        sourceCode: source,
        cpu: newCpu,
        assembledHex: asm.machineCode.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
        assemblyErrors: [],
        isRunning: false,
      });
      return true;
    },

    setRegister: (regName, val) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      writeReg8086(next, regName, val);
      set({ cpu: next });
    },

    setFlag: (flagName, val) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      next.registers.flags[flagName] = val;
      set({ cpu: next });
    },

    setMemoryByte: (physAddr, val) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      next.memory[physAddr & 0xFFFFF] = val & 0xFF;
      set({ cpu: next });
    },

    setMemoryWord: (physAddr, val) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      writeMem16(next, physAddr, val);
      set({ cpu: next });
    },

    setSourceCode: (sourceCode) => set({ sourceCode }),

    toggleBreakpoint: (addr) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      if (next.breakpoints.has(addr)) {
        next.breakpoints.delete(addr);
      } else {
        next.breakpoints.add(addr);
      }
      set({ cpu: next });
    },

    setConditionalBreakpoint: (addr, cond) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      if (!cond.trim()) {
        next.conditionalBreakpoints.delete(addr);
      } else {
        next.conditionalBreakpoints.set(addr, cond.trim());
      }
      set({ cpu: next });
    },

    clearTrace: () => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      next.trace = [];
      set({ cpu: next });
    },

    executeAluDirect: (op, valB, is16Bit) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      const valA = is16Bit ? next.registers.ax : (next.registers.ax & 0xFF);
      const res = executeAlu8086(op, valA, valB, is16Bit, next.registers.flags);
      if (op !== 'CMP' && op !== 'TEST') {
        if (is16Bit) {
          next.registers.ax = res.result;
          if (res.resultHigh !== undefined) next.registers.dx = res.resultHigh;
        } else {
          next.registers.ax = (next.registers.ax & 0xFF00) | (res.result & 0xFF);
          if (res.resultHigh !== undefined) {
            next.registers.ax = (next.registers.ax & 0x00FF) | ((res.resultHigh & 0xFF) << 8);
          }
        }
      }
      next.registers.flags = res.flags;
      next.microOpDescription = res.explanation;
      set({ cpu: next });
    },

    pushStackDirect: (val) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      pushStack(next, val);
      set({ cpu: next });
    },

    popStackDirect: () => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      const val = popStack(next);
      set({ cpu: next });
      return val;
    },

    inPortDirect: (port) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      const val = next.ioPorts[port & 0xFFFF] ?? 0xFF;
      next.registers.ax = (next.registers.ax & 0xFF00) | val;
      set({ cpu: next });
      return val;
    },

    outPortDirect: (port, val) => {
      const { cpu } = get();
      const next = cloneCpuState(cpu);
      const byteVal = val & 0xFF;
      next.ioPorts[port & 0xFFFF] = byteVal;
      if (port === 0x80) next.virtualIo.ledBar = byteVal;
      else if (port === 0x90) next.virtualIo.sevenSegmentLow = byteVal;
      else if (port === 0x91) next.virtualIo.sevenSegmentHigh = byteVal;
      else if (port === 0xA0) next.virtualIo.terminalOutput += String.fromCharCode(byteVal);
      set({ cpu: next });
    },
  };
});
