/**
 * Genuine Computer Architecture CPU Execution Engine
 * Drives the complete single-cycle datapath using registered component logic.
 */

import { computeALU } from './aluEngine';
import { decodeInstruction, ControlSignals } from './controlUnitEngine';
import { disassembleWord } from './assembler';

export type PipelineStage = 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';

export interface CpuState {
  pc: number;
  ir: number;
  currentDisassembly: string;
  registers: number[];
  flags: {
    zero: boolean;
    negative: boolean;
    carry: boolean;
    overflow: boolean;
  };
  ram: number[];
  halted: boolean;
  cycleCount: number;
  instructionCount: number;
  activeSignals: ControlSignals;
  currentStage: PipelineStage;
  stageDetails: {
    [key in PipelineStage]: string;
  };
}

export function createInitialCpuState(program: number[] = [], ramSize: number = 64): CpuState {
  const initialInstruction = program[0] ?? 0;
  const decoded = decodeInstruction((initialInstruction >> 12) & 0x0F);

  return {
    pc: 0,
    ir: initialInstruction,
    currentDisassembly: disassembleWord(initialInstruction),
    registers: Array(8).fill(0),
    flags: { zero: false, negative: false, carry: false, overflow: false },
    ram: Array(ramSize).fill(0),
    halted: false,
    cycleCount: 0,
    instructionCount: 0,
    activeSignals: decoded.signals,
    currentStage: 'IF',
    stageDetails: {
      IF: `Fetch instruction from Memory[PC=0]: 0x${initialInstruction.toString(16).toUpperCase()}`,
      ID: 'Decode opcode and read source registers',
      EX: 'Execute ALU operation',
      MEM: 'Memory read/write stage',
      WB: 'Writeback result to destination register',
    },
  };
}

export function stepCpu(state: CpuState, instructionMemory: number[]): CpuState {
  if (state.halted) return state;

  const currentPC = state.pc;
  const word = instructionMemory[currentPC] ?? 0;

  const opcode = (word >> 12) & 0x0F;
  const rd = (word >> 9) & 0x07;
  const rs = (word >> 6) & 0x07;
  const rtOrImm = word & 0x3F;

  const decoded = decodeInstruction(opcode);
  const signals = decoded.signals;

  if (signals.halt) {
    return {
      ...state,
      ir: word,
      currentDisassembly: 'HALT',
      activeSignals: signals,
      halted: true,
      cycleCount: state.cycleCount + 1,
      instructionCount: state.instructionCount + 1,
      stageDetails: {
        IF: `Fetch PC=${currentPC}: HALT`,
        ID: 'Decode HALT: CPU execution stopped',
        EX: 'ALU Idle',
        MEM: 'Memory Idle',
        WB: 'Writeback Idle',
      },
    };
  }

  // Stage 1: ID - Read Registers
  const valRs = state.registers[rs] ?? 0;
  const valRt = state.registers[rtOrImm & 0x07] ?? 0;
  const immVal = rtOrImm;

  // Stage 2: EX - ALU Operation
  const aluInputB = signals.aluSrc ? immVal : (signals.branch ? state.registers[rd] : valRt);
  const aluResult = computeALU(signals.aluOp, valRs, aluInputB, 8);

  // Stage 3: MEM - Memory Access
  const newRam = [...state.ram];
  let memReadData = 0;

  if (signals.memRead) {
    const memAddr = (rs !== 0 ? state.registers[rs] : immVal) % newRam.length;
    memReadData = newRam[memAddr] ?? 0;
  } else if (signals.memWrite) {
    const memAddr = (rd !== 0 ? state.registers[rd] : immVal) % newRam.length;
    newRam[memAddr] = valRs & 0xFF;
  }

  // Stage 4: WB - Write Back
  const newRegisters = [...state.registers];
  const writeBackData = signals.memToReg ? memReadData : aluResult.result;

  if (signals.regWrite) {
    newRegisters[rd] = writeBackData & 0xFF;
  }

  // Branch / Jump PC Update
  let nextPC = currentPC + 1;

  if (signals.jump) {
    nextPC = immVal;
  } else if (signals.branch) {
    const conditionMet =
      (signals.branchCondition === 'BEQ' && valRs === state.registers[rd]) ||
      (signals.branchCondition === 'BNE' && valRs !== state.registers[rd]);

    if (conditionMet) {
      nextPC = immVal;
    }
  }

  return {
    pc: nextPC,
    ir: word,
    currentDisassembly: disassembleWord(word),
    registers: newRegisters,
    flags: aluResult.flags,
    ram: newRam,
    halted: false,
    cycleCount: state.cycleCount + 1,
    instructionCount: state.instructionCount + 1,
    activeSignals: signals,
    currentStage: 'WB',
    stageDetails: {
      IF: `Fetch instruction at PC=${currentPC} => 0x${word.toString(16).toUpperCase()}`,
      ID: `Decode ${decoded.mnemonic}: Rs(R${rs})=${valRs}, Rt/Imm=${aluInputB}`,
      EX: `ALU Execution ${aluResult.operationName} => ${aluResult.result}`,
      MEM: signals.memRead ? `Read RAM[${immVal}]=${memReadData}` : signals.memWrite ? `Write RAM[${immVal}]=${valRs}` : 'Idle',
      WB: signals.regWrite ? `Writeback R${rd} = ${writeBackData}` : 'Idle',
    },
  };
}
