/**
 * Intel 8086 Full CPU Execution Engine & Hardware State Machine
 * Implements authoritative 16-bit register file, 1MB memory subsystem,
 * 6-byte instruction prefetch queue, BIU/EU cycle transitions, stack frames,
 * hardware I/O ports, and multi-mode debugging.
 */

import {
  CPU8086State,
  Flags8086,
  Registers8086,
  calculatePhysicalAddress,
  flagsToWord,
  wordToFlags,
  TraceStep8086,
} from './cpu8086Types';
import { executeAlu8086, Alu8086Op } from './alu8086';

// ── 8-bit / 16-bit Register Accessors ──────────────────────────────────────────

export function getReg16(regs: Registers8086, name: string): number {
  const n = name.toUpperCase();
  switch (n) {
    case 'AX': return regs.ax & 0xFFFF;
    case 'BX': return regs.bx & 0xFFFF;
    case 'CX': return regs.cx & 0xFFFF;
    case 'DX': return regs.dx & 0xFFFF;
    case 'SP': return regs.sp & 0xFFFF;
    case 'BP': return regs.bp & 0xFFFF;
    case 'SI': return regs.si & 0xFFFF;
    case 'DI': return regs.di & 0xFFFF;
    case 'CS': return regs.cs & 0xFFFF;
    case 'DS': return regs.ds & 0xFFFF;
    case 'SS': return regs.ss & 0xFFFF;
    case 'ES': return regs.es & 0xFFFF;
    case 'IP': return regs.ip & 0xFFFF;
    case 'FLAGS': return flagsToWord(regs.flags);
    default: return 0;
  }
}

export function setReg16(regs: Registers8086, name: string, val: number): void {
  const n = name.toUpperCase();
  const v = val & 0xFFFF;
  switch (n) {
    case 'AX': regs.ax = v; break;
    case 'BX': regs.bx = v; break;
    case 'CX': regs.cx = v; break;
    case 'DX': regs.dx = v; break;
    case 'SP': regs.sp = v; break;
    case 'BP': regs.bp = v; break;
    case 'SI': regs.si = v; break;
    case 'DI': regs.di = v; break;
    case 'CS': regs.cs = v; break;
    case 'DS': regs.ds = v; break;
    case 'SS': regs.ss = v; break;
    case 'ES': regs.es = v; break;
    case 'IP': regs.ip = v; break;
    case 'FLAGS': regs.flags = wordToFlags(v); break;
  }
}

export function getReg8(regs: Registers8086, name: string): number {
  const n = name.toUpperCase();
  switch (n) {
    case 'AL': return regs.ax & 0xFF;
    case 'AH': return (regs.ax >> 8) & 0xFF;
    case 'BL': return regs.bx & 0xFF;
    case 'BH': return (regs.bx >> 8) & 0xFF;
    case 'CL': return regs.cx & 0xFF;
    case 'CH': return (regs.cx >> 8) & 0xFF;
    case 'DL': return regs.dx & 0xFF;
    case 'DH': return (regs.dx >> 8) & 0xFF;
    default: return 0;
  }
}

export function setReg8(regs: Registers8086, name: string, val: number): void {
  const n = name.toUpperCase();
  const v = val & 0xFF;
  switch (n) {
    case 'AL': regs.ax = (regs.ax & 0xFF00) | v; break;
    case 'AH': regs.ax = (regs.ax & 0x00FF) | (v << 8); break;
    case 'BL': regs.bx = (regs.bx & 0xFF00) | v; break;
    case 'BH': regs.bx = (regs.bx & 0x00FF) | (v << 8); break;
    case 'CL': regs.cx = (regs.cx & 0xFF00) | v; break;
    case 'CH': regs.cx = (regs.cx & 0x00FF) | (v << 8); break;
    case 'DL': regs.dx = (regs.dx & 0xFF00) | v; break;
    case 'DH': regs.dx = (regs.dx & 0x00FF) | (v << 8); break;
  }
}

// ── Memory Read / Write Utilities (Little-Endian 8086) ─────────────────────────

export function readMem8(memory: Uint8Array, seg: number, off: number): number {
  const phys = calculatePhysicalAddress(seg, off);
  return memory[phys] ?? 0;
}

export function writeMem8(memory: Uint8Array, seg: number, off: number, val: number): void {
  const phys = calculatePhysicalAddress(seg, off);
  memory[phys] = val & 0xFF;
}

export function readMem16(memory: Uint8Array, seg: number, off: number): number {
  const low = readMem8(memory, seg, off);
  const high = readMem8(memory, seg, (off + 1) & 0xFFFF);
  return (low | (high << 8)) & 0xFFFF;
}

export function writeMem16(memory: Uint8Array, seg: number, off: number, val: number): void {
  writeMem8(memory, seg, off, val & 0xFF);
  writeMem8(memory, seg, (off + 1) & 0xFFFF, (val >> 8) & 0xFF);
}

// ── Stack Operations ─────────────────────────────────────────────────────────

export function pushStack(state: CPU8086State, val: number): void {
  state.registers.sp = (state.registers.sp - 2) & 0xFFFF;
  writeMem16(state.memory, state.registers.ss, state.registers.sp, val);
}

export function popStack(state: CPU8086State): number {
  const val = readMem16(state.memory, state.registers.ss, state.registers.sp);
  state.registers.sp = (state.registers.sp + 2) & 0xFFFF;
  return val;
}

// ── BIU Queue Refill & Prefetch ───────────────────────────────────────────────

export function refillQueue(state: CPU8086State): void {
  while (state.queue.length < 6) {
    const prefetchOffset = (state.registers.ip + state.queue.length) & 0xFFFF;
    const b = readMem8(state.memory, state.registers.cs, prefetchOffset);
    state.queue.push(b);
  }
}

// ── Single Instruction Execution Step ────────────────────────────────────────

export function step8086(state: CPU8086State): CPU8086State {
  if (state.halted) return state;

  // Clone registers & flags for trace step diffs
  const regsBefore: Registers8086 = {
    ...state.registers,
    flags: { ...state.registers.flags },
  };
  const flagsBefore: Flags8086 = { ...state.registers.flags };

  // Refill queue if needed
  refillQueue(state);

  const startIP = state.registers.ip;
  const startPhysical = calculatePhysicalAddress(state.registers.cs, startIP);
  const opcode = readMem8(state.memory, state.registers.cs, startIP);

  let ipAdvance = 1;
  let disassembly = 'NOP';
  let explanation = '';
  let cyclesUsed = 4; // Base T-states

  const reg16Names = ['AX', 'CX', 'DX', 'BX', 'SP', 'BP', 'SI', 'DI'];
  const reg8Names = ['AL', 'CL', 'DL', 'BL', 'AH', 'CH', 'DH', 'BH'];

  // Helper to read immediate 8/16 from memory
  const fetchImm8 = () => readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
  const fetchImm16 = () => readMem16(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);

  switch (opcode) {
    case 0x90: { // NOP
      disassembly = 'NOP';
      explanation = 'No operation. 3 T-states.';
      cyclesUsed = 3;
      break;
    }

    case 0xF4: { // HLT
      state.halted = true;
      disassembly = 'HLT';
      explanation = 'Processor halted.';
      cyclesUsed = 2;
      break;
    }

    case 0x98: { // CBW
      const res = executeAlu8086('CBW', state.registers.ax, 0, false, state.registers.flags);
      state.registers.ax = res.result;
      disassembly = 'CBW';
      explanation = res.explanation;
      cyclesUsed = 2;
      break;
    }

    case 0x99: { // CWD
      const res = executeAlu8086('CWD', state.registers.ax, 0, true, state.registers.flags);
      state.registers.dx = res.resultHigh ?? 0;
      disassembly = 'CWD';
      explanation = res.explanation;
      cyclesUsed = 5;
      break;
    }

    case 0x9C: { // PUSHF
      pushStack(state, flagsToWord(state.registers.flags));
      disassembly = 'PUSHF';
      explanation = 'Pushed FLAGS register onto stack.';
      cyclesUsed = 10;
      break;
    }

    case 0x9D: { // POPF
      state.registers.flags = wordToFlags(popStack(state));
      disassembly = 'POPF';
      explanation = 'Popped FLAGS register from stack.';
      cyclesUsed = 8;
      break;
    }

    case 0xF8: { // CLC
      state.registers.flags.cf = false;
      disassembly = 'CLC';
      explanation = 'Clear Carry Flag (CF = 0).';
      cyclesUsed = 2;
      break;
    }

    case 0xF9: { // STC
      state.registers.flags.cf = true;
      disassembly = 'STC';
      explanation = 'Set Carry Flag (CF = 1).';
      cyclesUsed = 2;
      break;
    }

    case 0xF5: { // CMC
      state.registers.flags.cf = !state.registers.flags.cf;
      disassembly = 'CMC';
      explanation = 'Complement Carry Flag (CF = ~CF).';
      cyclesUsed = 2;
      break;
    }

    case 0xFC: { // CLD
      state.registers.flags.df = false;
      disassembly = 'CLD';
      explanation = 'Clear Direction Flag (DF = 0, autoincrement string pointers).';
      cyclesUsed = 2;
      break;
    }

    case 0xFD: { // STD
      state.registers.flags.df = true;
      disassembly = 'STD';
      explanation = 'Set Direction Flag (DF = 1, autodecrement string pointers).';
      cyclesUsed = 2;
      break;
    }

    case 0xFA: { // CLI
      state.registers.flags.if = false;
      disassembly = 'CLI';
      explanation = 'Clear Interrupt Flag (IF = 0, disable maskable interrupts).';
      cyclesUsed = 2;
      break;
    }

    case 0xFB: { // STI
      state.registers.flags.if = true;
      disassembly = 'STI';
      explanation = 'Set Interrupt Flag (IF = 1, enable maskable interrupts).';
      cyclesUsed = 2;
      break;
    }

    case 0x27: { // DAA
      const res = executeAlu8086('DAA', state.registers.ax, 0, false, state.registers.flags);
      state.registers.ax = (state.registers.ax & 0xFF00) | (res.result & 0xFF);
      state.registers.flags = res.flags;
      disassembly = 'DAA';
      explanation = res.explanation;
      cyclesUsed = 4;
      break;
    }

    case 0x2F: { // DAS
      const res = executeAlu8086('DAS', state.registers.ax, 0, false, state.registers.flags);
      state.registers.ax = (state.registers.ax & 0xFF00) | (res.result & 0xFF);
      state.registers.flags = res.flags;
      disassembly = 'DAS';
      explanation = res.explanation;
      cyclesUsed = 4;
      break;
    }

    case 0x37: { // AAA
      const res = executeAlu8086('AAA', state.registers.ax, 0, false, state.registers.flags);
      state.registers.ax = res.result & 0xFFFF;
      state.registers.flags = res.flags;
      disassembly = 'AAA';
      explanation = res.explanation;
      cyclesUsed = 4;
      break;
    }

    case 0x3F: { // AAS
      const res = executeAlu8086('AAS', state.registers.ax, 0, false, state.registers.flags);
      state.registers.ax = res.result & 0xFFFF;
      state.registers.flags = res.flags;
      disassembly = 'AAS';
      explanation = res.explanation;
      cyclesUsed = 4;
      break;
    }

    case 0xD4: { // AAM imm8
      const base = fetchImm8() || 10;
      const res = executeAlu8086('AAM', state.registers.ax, base, false, state.registers.flags);
      state.registers.ax = res.result;
      state.registers.flags = res.flags;
      ipAdvance = 2;
      disassembly = `AAM 0x${base.toString(16).toUpperCase()}`;
      explanation = res.explanation;
      cyclesUsed = 83;
      break;
    }

    case 0xD5: { // AAD imm8
      const base = fetchImm8() || 10;
      const res = executeAlu8086('AAD', state.registers.ax, base, false, state.registers.flags);
      state.registers.ax = res.result;
      state.registers.flags = res.flags;
      ipAdvance = 2;
      disassembly = `AAD 0x${base.toString(16).toUpperCase()}`;
      explanation = res.explanation;
      cyclesUsed = 60;
      break;
    }


    case 0x9E: { // SAHF
      const ah = (state.registers.ax >> 8) & 0xFF;
      const curWord = flagsToWord(state.registers.flags);
      state.registers.flags = wordToFlags((curWord & 0xFF00) | ah);
      disassembly = 'SAHF';
      explanation = `Stored AH (0x${ah.toString(16).toUpperCase()}) into low 8 bits of FLAGS.`;
      cyclesUsed = 4;
      break;
    }

    case 0x9F: { // LAHF
      const flagsLow = flagsToWord(state.registers.flags) & 0xFF;
      state.registers.ax = (state.registers.ax & 0x00FF) | (flagsLow << 8);
      disassembly = 'LAHF';
      explanation = `Loaded low 8 bits of FLAGS (0x${flagsLow.toString(16).toUpperCase()}) into AH.`;
      cyclesUsed = 4;
      break;
    }

    case 0xD7: { // XLAT
      const offset = (state.registers.bx + (state.registers.ax & 0xFF)) & 0xFFFF;
      const val = readMem8(state.memory, state.registers.ds, offset);
      state.registers.ax = (state.registers.ax & 0xFF00) | val;
      disassembly = 'XLAT';
      explanation = `Table lookup at DS:[BX+AL] => AL = 0x${val.toString(16).toUpperCase()}.`;
      cyclesUsed = 11;
      break;
    }

    case 0x8D: { // LEA reg16, [mem]
      const modRM = readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
      const reg = (modRM >> 3) & 0x07;
      const disp16 = readMem16(state.memory, state.registers.cs, (startIP + 2) & 0xFFFF);
      const regName = reg16Names[reg];
      setReg16(state.registers, regName, disp16);
      ipAdvance = 4;
      disassembly = `LEA ${regName}, [0x${disp16.toString(16).toUpperCase()}]`;
      explanation = `Loaded Effective Address 0x${disp16.toString(16).toUpperCase()} into ${regName}.`;
      cyclesUsed = 2;
      break;
    }

    case 0xC5: { // LDS reg16, [mem]
      const modRM = readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
      const reg = (modRM >> 3) & 0x07;
      const disp16 = readMem16(state.memory, state.registers.cs, (startIP + 2) & 0xFFFF);
      const regName = reg16Names[reg];
      const offsetVal = readMem16(state.memory, state.registers.ds, disp16);
      const segVal = readMem16(state.memory, state.registers.ds, (disp16 + 2) & 0xFFFF);
      setReg16(state.registers, regName, offsetVal);
      state.registers.ds = segVal;
      ipAdvance = 4;
      disassembly = `LDS ${regName}, [0x${disp16.toString(16).toUpperCase()}]`;
      explanation = `Loaded far pointer into ${regName}=0x${offsetVal.toString(16).toUpperCase()} and DS=0x${segVal.toString(16).toUpperCase()}.`;
      cyclesUsed = 16;
      break;
    }

    case 0xC4: { // LES reg16, [mem]
      const modRM = readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
      const reg = (modRM >> 3) & 0x07;
      const disp16 = readMem16(state.memory, state.registers.cs, (startIP + 2) & 0xFFFF);
      const regName = reg16Names[reg];
      const offsetVal = readMem16(state.memory, state.registers.ds, disp16);
      const segVal = readMem16(state.memory, state.registers.ds, (disp16 + 2) & 0xFFFF);
      setReg16(state.registers, regName, offsetVal);
      state.registers.es = segVal;
      ipAdvance = 4;
      disassembly = `LES ${regName}, [0x${disp16.toString(16).toUpperCase()}]`;
      explanation = `Loaded far pointer into ${regName}=0x${offsetVal.toString(16).toUpperCase()} and ES=0x${segVal.toString(16).toUpperCase()}.`;
      cyclesUsed = 16;
      break;
    }

    // ── String Operations ────────────────────────────────────────────────
    case 0xA4: { // MOVSB
      const b = readMem8(state.memory, state.registers.ds, state.registers.si);
      writeMem8(state.memory, state.registers.es, state.registers.di, b);
      const delta = state.registers.flags.df ? -1 : 1;
      state.registers.si = (state.registers.si + delta) & 0xFFFF;
      state.registers.di = (state.registers.di + delta) & 0xFFFF;
      disassembly = 'MOVSB';
      explanation = `Moved byte 0x${b.toString(16).toUpperCase()} from DS:SI to ES:DI. SI/DI adjusted by ${delta}.`;
      cyclesUsed = 18;
      break;
    }

    case 0xA5: { // MOVSW
      const w = readMem16(state.memory, state.registers.ds, state.registers.si);
      writeMem16(state.memory, state.registers.es, state.registers.di, w);
      const delta = state.registers.flags.df ? -2 : 2;
      state.registers.si = (state.registers.si + delta) & 0xFFFF;
      state.registers.di = (state.registers.di + delta) & 0xFFFF;
      disassembly = 'MOVSW';
      explanation = `Moved word 0x${w.toString(16).toUpperCase()} from DS:SI to ES:DI. SI/DI adjusted by ${delta}.`;
      cyclesUsed = 18;
      break;
    }

    case 0xAA: { // STOSB
      const b = state.registers.ax & 0xFF;
      writeMem8(state.memory, state.registers.es, state.registers.di, b);
      const delta = state.registers.flags.df ? -1 : 1;
      state.registers.di = (state.registers.di + delta) & 0xFFFF;
      disassembly = 'STOSB';
      explanation = `Stored AL(0x${b.toString(16).toUpperCase()}) to ES:DI. DI adjusted by ${delta}.`;
      cyclesUsed = 11;
      break;
    }

    case 0xAB: { // STOSW
      const w = state.registers.ax;
      writeMem16(state.memory, state.registers.es, state.registers.di, w);
      const delta = state.registers.flags.df ? -2 : 2;
      state.registers.di = (state.registers.di + delta) & 0xFFFF;
      disassembly = 'STOSW';
      explanation = `Stored AX(0x${w.toString(16).toUpperCase()}) to ES:DI. DI adjusted by ${delta}.`;
      cyclesUsed = 11;
      break;
    }

    case 0xAC: { // LODSB
      const b = readMem8(state.memory, state.registers.ds, state.registers.si);
      state.registers.ax = (state.registers.ax & 0xFF00) | b;
      const delta = state.registers.flags.df ? -1 : 1;
      state.registers.si = (state.registers.si + delta) & 0xFFFF;
      disassembly = 'LODSB';
      explanation = `Loaded byte 0x${b.toString(16).toUpperCase()} from DS:SI into AL. SI adjusted by ${delta}.`;
      cyclesUsed = 12;
      break;
    }

    case 0xAD: { // LODSW
      const w = readMem16(state.memory, state.registers.ds, state.registers.si);
      state.registers.ax = w;
      const delta = state.registers.flags.df ? -2 : 2;
      state.registers.si = (state.registers.si + delta) & 0xFFFF;
      disassembly = 'LODSW';
      explanation = `Loaded word 0x${w.toString(16).toUpperCase()} from DS:SI into AX. SI adjusted by ${delta}.`;
      cyclesUsed = 12;
      break;
    }

    case 0xAE: { // SCASB
      const b = readMem8(state.memory, state.registers.es, state.registers.di);
      const res = executeAlu8086('CMP', state.registers.ax & 0xFF, b, false, state.registers.flags);
      state.registers.flags = res.flags;
      const delta = state.registers.flags.df ? -1 : 1;
      state.registers.di = (state.registers.di + delta) & 0xFFFF;
      disassembly = 'SCASB';
      explanation = `Scanned byte at ES:DI (0x${b.toString(16).toUpperCase()}) with AL. Flags updated.`;
      cyclesUsed = 15;
      break;
    }

    case 0xAF: { // SCASW
      const w = readMem16(state.memory, state.registers.es, state.registers.di);
      const res = executeAlu8086('CMP', state.registers.ax, w, true, state.registers.flags);
      state.registers.flags = res.flags;
      const delta = state.registers.flags.df ? -2 : 2;
      state.registers.di = (state.registers.di + delta) & 0xFFFF;
      disassembly = 'SCASW';
      explanation = `Scanned word at ES:DI (0x${w.toString(16).toUpperCase()}) with AX. Flags updated.`;
      cyclesUsed = 15;
      break;
    }

    case 0xA6: { // CMPSB
      const b1 = readMem8(state.memory, state.registers.ds, state.registers.si);
      const b2 = readMem8(state.memory, state.registers.es, state.registers.di);
      const res = executeAlu8086('CMP', b1, b2, false, state.registers.flags);
      state.registers.flags = res.flags;
      const delta = state.registers.flags.df ? -1 : 1;
      state.registers.si = (state.registers.si + delta) & 0xFFFF;
      state.registers.di = (state.registers.di + delta) & 0xFFFF;
      disassembly = 'CMPSB';
      explanation = `Compared DS:SI (0x${b1.toString(16).toUpperCase()}) with ES:DI (0x${b2.toString(16).toUpperCase()}).`;
      cyclesUsed = 22;
      break;
    }

    case 0xA7: { // CMPSW
      const w1 = readMem16(state.memory, state.registers.ds, state.registers.si);
      const w2 = readMem16(state.memory, state.registers.es, state.registers.di);
      const res = executeAlu8086('CMP', w1, w2, true, state.registers.flags);
      state.registers.flags = res.flags;
      const delta = state.registers.flags.df ? -2 : 2;
      state.registers.si = (state.registers.si + delta) & 0xFFFF;
      state.registers.di = (state.registers.di + delta) & 0xFFFF;
      disassembly = 'CMPSW';
      explanation = `Compared DS:SI (0x${w1.toString(16).toUpperCase()}) with ES:DI (0x${w2.toString(16).toUpperCase()}).`;
      cyclesUsed = 22;
      break;
    }

    case 0xC3: { // RET
      state.registers.ip = popStack(state);
      ipAdvance = 0; // IP is directly replaced
      disassembly = 'RET';
      explanation = `Return from procedure. Popped IP = 0x${state.registers.ip.toString(16).toUpperCase()}.`;
      cyclesUsed = 8;
      break;
    }

    case 0xCB: { // RETF (Far Return)
      state.registers.ip = popStack(state);
      state.registers.cs = popStack(state);
      ipAdvance = 0;
      disassembly = 'RETF';
      explanation = `Far Return. Popped CS:IP = ${state.registers.cs.toString(16).toUpperCase()}:${state.registers.ip.toString(16).toUpperCase()}.`;
      cyclesUsed = 14;
      break;
    }

    // ── PUSH reg16 (0x50..0x57) ──────────────────────────────────────────
    case 0x50: case 0x51: case 0x52: case 0x53: case 0x54: case 0x55: case 0x56: case 0x57: {
      const regIdx = opcode - 0x50;
      const regName = reg16Names[regIdx];
      const val = getReg16(state.registers, regName);
      pushStack(state, val);
      disassembly = `PUSH ${regName}`;
      explanation = `Pushed ${regName} (0x${val.toString(16).toUpperCase()}) onto stack. SP = 0x${state.registers.sp.toString(16).toUpperCase()}.`;
      cyclesUsed = 10;
      break;
    }

    // ── POP reg16 (0x58..0x5F) ───────────────────────────────────────────
    case 0x58: case 0x59: case 0x5A: case 0x5B: case 0x5C: case 0x5D: case 0x5E: case 0x5F: {
      const regIdx = opcode - 0x58;
      const regName = reg16Names[regIdx];
      const val = popStack(state);
      setReg16(state.registers, regName, val);
      disassembly = `POP ${regName}`;
      explanation = `Popped 0x${val.toString(16).toUpperCase()} from stack into ${regName}. SP = 0x${state.registers.sp.toString(16).toUpperCase()}.`;
      cyclesUsed = 8;
      break;
    }

    // ── MOV reg16, imm16 (0xB8..0xBF) ────────────────────────────────────
    case 0xB8: case 0xB9: case 0xBA: case 0xBB: case 0xBC: case 0xBD: case 0xBE: case 0xBF: {
      const regIdx = opcode - 0xB8;
      const regName = reg16Names[regIdx];
      const imm16 = fetchImm16();
      setReg16(state.registers, regName, imm16);
      ipAdvance = 3;
      disassembly = `MOV ${regName}, 0x${imm16.toString(16).toUpperCase().padStart(4, '0')}`;
      explanation = `Loaded immediate 0x${imm16.toString(16).toUpperCase()} into ${regName}.`;
      cyclesUsed = 4;
      break;
    }

    // ── MOV reg8, imm8 (0xB0..0xB7) ──────────────────────────────────────
    case 0xB0: case 0xB1: case 0xB2: case 0xB3: case 0xB4: case 0xB5: case 0xB6: case 0xB7: {
      const regIdx = opcode - 0xB0;
      const regName = reg8Names[regIdx];
      const imm8 = fetchImm8();
      setReg8(state.registers, regName, imm8);
      ipAdvance = 2;
      disassembly = `MOV ${regName}, 0x${imm8.toString(16).toUpperCase().padStart(2, '0')}`;
      explanation = `Loaded immediate 0x${imm8.toString(16).toUpperCase()} into ${regName}.`;
      cyclesUsed = 4;
      break;
    }

    // ── INC reg16 (0x40..0x47) ───────────────────────────────────────────
    case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47: {
      const regIdx = opcode - 0x40;
      const regName = reg16Names[regIdx];
      const val = getReg16(state.registers, regName);
      const res = executeAlu8086('INC', val, 0, true, state.registers.flags);
      setReg16(state.registers, regName, res.result);
      state.registers.flags = res.flags;
      disassembly = `INC ${regName}`;
      explanation = res.explanation;
      cyclesUsed = 2;
      break;
    }

    // ── DEC reg16 (0x48..0x4F) ───────────────────────────────────────────
    case 0x48: case 0x49: case 0x4A: case 0x4B: case 0x4C: case 0x4D: case 0x4E: case 0x4F: {
      const regIdx = opcode - 0x48;
      const regName = reg16Names[regIdx];
      const val = getReg16(state.registers, regName);
      const res = executeAlu8086('DEC', val, 0, true, state.registers.flags);
      setReg16(state.registers, regName, res.result);
      state.registers.flags = res.flags;
      disassembly = `DEC ${regName}`;
      explanation = res.explanation;
      cyclesUsed = 2;
      break;
    }

    // ── MOV reg16, reg16 or memory (0x89 / 0x8B / 0x88 / 0x8A) ───────────
    case 0x89: case 0x8B: case 0x88: case 0x8A: {
      const modRM = readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
      const mod = (modRM >> 6) & 0x03;
      const reg = (modRM >> 3) & 0x07;
      const rm = modRM & 0x07;
      const isWord = (opcode === 0x89 || opcode === 0x8B);

      if (mod === 3) {
        // Register-to-register
        if (isWord) {
          const srcName = reg16Names[reg];
          const dstName = reg16Names[rm];
          const val = getReg16(state.registers, srcName);
          setReg16(state.registers, dstName, val);
          disassembly = `MOV ${dstName}, ${srcName}`;
          explanation = `Copied ${srcName}(0x${val.toString(16).toUpperCase()}) to ${dstName}.`;
        } else {
          const srcName = reg8Names[reg];
          const dstName = reg8Names[rm];
          const val = getReg8(state.registers, srcName);
          setReg8(state.registers, dstName, val);
          disassembly = `MOV ${dstName}, ${srcName}`;
          explanation = `Copied ${srcName}(0x${val.toString(16).toUpperCase()}) to ${dstName}.`;
        }
        ipAdvance = 2;
      } else if (mod === 0 && rm === 6) {
        // Direct address [disp16]
        const disp16 = readMem16(state.memory, state.registers.cs, (startIP + 2) & 0xFFFF);
        if (opcode === 0x89) { // MOV [disp16], reg16
          const val = getReg16(state.registers, reg16Names[reg]);
          writeMem16(state.memory, state.registers.ds, disp16, val);
          disassembly = `MOV [0x${disp16.toString(16).toUpperCase()}], ${reg16Names[reg]}`;
          explanation = `Stored ${reg16Names[reg]}(0x${val.toString(16).toUpperCase()}) to DS:[0x${disp16.toString(16).toUpperCase()}].`;
        } else if (opcode === 0x8B) { // MOV reg16, [disp16]
          const val = readMem16(state.memory, state.registers.ds, disp16);
          setReg16(state.registers, reg16Names[reg], val);
          disassembly = `MOV ${reg16Names[reg]}, [0x${disp16.toString(16).toUpperCase()}]`;
          explanation = `Loaded 0x${val.toString(16).toUpperCase()} from DS:[0x${disp16.toString(16).toUpperCase()}] into ${reg16Names[reg]}.`;
        } else if (opcode === 0x88) { // MOV [disp16], reg8
          const val = getReg8(state.registers, reg8Names[reg]);
          writeMem8(state.memory, state.registers.ds, disp16, val);
          disassembly = `MOV [0x${disp16.toString(16).toUpperCase()}], ${reg8Names[reg]}`;
        } else { // MOV reg8, [disp16]
          const val = readMem8(state.memory, state.registers.ds, disp16);
          setReg8(state.registers, reg8Names[reg], val);
          disassembly = `MOV ${reg8Names[reg]}, [0x${disp16.toString(16).toUpperCase()}]`;
        }
        ipAdvance = 4;
      }
      cyclesUsed = mod === 3 ? 2 : 9;
      break;
    }

    // ── Arithmetic & Logic (ADD: 0x01, SUB: 0x29, AND: 0x21, OR: 0x09, XOR: 0x31, CMP: 0x39)
    case 0x01: case 0x29: case 0x21: case 0x09: case 0x31: case 0x39: {
      const opMap: Record<number, Alu8086Op> = {
        0x01: 'ADD', 0x29: 'SUB', 0x21: 'AND', 0x09: 'OR', 0x31: 'XOR', 0x39: 'CMP',
      };
      const aluOp = opMap[opcode] ?? 'ADD';
      const modRM = readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
      const mod = (modRM >> 6) & 0x03;
      const reg = (modRM >> 3) & 0x07;
      const rm = modRM & 0x07;

      if (mod === 3) {
        const srcName = reg16Names[reg];
        const dstName = reg16Names[rm];
        const a = getReg16(state.registers, dstName);
        const b = getReg16(state.registers, srcName);
        const res = executeAlu8086(aluOp, a, b, true, state.registers.flags);
        if (aluOp !== 'CMP') {
          setReg16(state.registers, dstName, res.result);
        }
        state.registers.flags = res.flags;
        disassembly = `${aluOp} ${dstName}, ${srcName}`;
        explanation = res.explanation;
        ipAdvance = 2;
      }
      cyclesUsed = 3;
      break;
    }

    // ── Arithmetic Immediate (0x81 / 0x83 / 0x80) ─────────────────────────
    case 0x81: case 0x83: case 0x80: {
      const modRM = readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
      const regOp = (modRM >> 3) & 0x07;
      const rm = modRM & 0x07;
      const is16Bit = opcode === 0x81 || opcode === 0x83;
      const isSignedImm8 = opcode === 0x83;

      const ops: Alu8086Op[] = ['ADD', 'OR', 'ADC', 'SBB', 'AND', 'SUB', 'XOR', 'CMP'];
      const aluOp = ops[regOp] ?? 'ADD';

      const targetRegName = is16Bit ? reg16Names[rm] : reg8Names[rm];
      const a = is16Bit ? getReg16(state.registers, targetRegName) : getReg8(state.registers, targetRegName);
      let imm = 0;

      if (isSignedImm8) {
        const imm8 = readMem8(state.memory, state.registers.cs, (startIP + 2) & 0xFFFF);
        imm = (imm8 << 24) >> 24; // sign-extended
        ipAdvance = 3;
      } else if (is16Bit) {
        imm = readMem16(state.memory, state.registers.cs, (startIP + 2) & 0xFFFF);
        ipAdvance = 4;
      } else {
        imm = readMem8(state.memory, state.registers.cs, (startIP + 2) & 0xFFFF);
        ipAdvance = 3;
      }

      const res = executeAlu8086(aluOp, a, imm, is16Bit, state.registers.flags);
      if (aluOp !== 'CMP') {
        if (is16Bit) setReg16(state.registers, targetRegName, res.result);
        else setReg8(state.registers, targetRegName, res.result);
      }
      state.registers.flags = res.flags;
      disassembly = `${aluOp} ${targetRegName}, 0x${(imm & (is16Bit ? 0xFFFF : 0xFF)).toString(16).toUpperCase()}`;
      explanation = res.explanation;
      cyclesUsed = 4;
      break;
    }

    // ── Shifts & Rotates (0xD0..0xD3) ────────────────────────────────────
    case 0xD0: case 0xD1: case 0xD2: case 0xD3: {
      const modRM = readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
      const regOp = (modRM >> 3) & 0x07;
      const rm = modRM & 0x07;
      const is16Bit = opcode === 0xD1 || opcode === 0xD3;
      const isCL = opcode === 0xD2 || opcode === 0xD3;
      const count = isCL ? (state.registers.cx & 0xFF) : 1;

      const ops: Alu8086Op[] = ['ROL', 'ROR', 'RCL', 'RCR', 'SHL', 'SHR', 'SAL', 'SAR'];
      const aluOp = ops[regOp] ?? 'SHL';

      const regName = is16Bit ? reg16Names[rm] : reg8Names[rm];
      const val = is16Bit ? getReg16(state.registers, regName) : getReg8(state.registers, regName);
      const res = executeAlu8086(aluOp, val, count, is16Bit, state.registers.flags);

      if (is16Bit) setReg16(state.registers, regName, res.result);
      else setReg8(state.registers, regName, res.result);

      state.registers.flags = res.flags;
      disassembly = `${aluOp} ${regName}, ${isCL ? 'CL' : '1'}`;
      explanation = res.explanation;
      ipAdvance = 2;
      cyclesUsed = isCL ? (8 + 4 * count) : 2;
      break;
    }

    // ── Unary Operations (0xF7 / 0xF6) ───────────────────────────────────
    case 0xF7: case 0xF6: {
      const modRM = readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
      const regOp = (modRM >> 3) & 0x07;
      const rm = modRM & 0x07;
      const is16Bit = opcode === 0xF7;
      const regName = is16Bit ? reg16Names[rm] : reg8Names[rm];
      const val = is16Bit ? getReg16(state.registers, regName) : getReg8(state.registers, regName);

      const ops: Alu8086Op[] = ['TEST', 'TEST', 'NOT', 'NEG', 'MUL', 'IMUL', 'DIV', 'IDIV'];
      const aluOp = ops[regOp] ?? 'NOT';

      const res = executeAlu8086(aluOp, val, state.registers.ax, is16Bit, state.registers.flags);
      if (aluOp === 'MUL' || aluOp === 'IMUL') {
        state.registers.ax = res.result;
        if (is16Bit && res.resultHigh !== undefined) state.registers.dx = res.resultHigh;
      } else if (aluOp === 'DIV' || aluOp === 'IDIV') {
        if (is16Bit) {
          state.registers.ax = res.result;
          state.registers.dx = res.resultHigh ?? 0;
        } else {
          state.registers.ax = (res.result & 0xFF) | ((res.resultHigh ?? 0) << 8);
        }
      } else if (aluOp === 'NOT' || aluOp === 'NEG') {
        if (is16Bit) setReg16(state.registers, regName, res.result);
        else setReg8(state.registers, regName, res.result);
      }
      state.registers.flags = res.flags;
      disassembly = `${aluOp} ${regName}`;
      explanation = res.explanation;
      ipAdvance = 2;
      cyclesUsed = 30; // Multiplication / division takes multiple cycles
      break;
    }

    // ── Relative Jumps & Branching ─────────────────────────────────────────
    case 0xEB: { // JMP rel8
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
      ipAdvance = 0;
      disassembly = `JMP 0x${state.registers.ip.toString(16).toUpperCase().padStart(4, '0')}`;
      explanation = `Unconditional Jump to 0x${state.registers.ip.toString(16).toUpperCase()}.`;
      cyclesUsed = 15;
      break;
    }

    case 0x74: { // JE / JZ
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.flags.zf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
        explanation = `Jump taken (ZF=1) to 0x${state.registers.ip.toString(16).toUpperCase()}.`;
      } else {
        ipAdvance = 2;
        explanation = `Jump not taken (ZF=0).`;
      }
      disassembly = `JE 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x75: { // JNE / JNZ
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (!state.registers.flags.zf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
        explanation = `Jump taken (ZF=0) to 0x${state.registers.ip.toString(16).toUpperCase()}.`;
      } else {
        ipAdvance = 2;
        explanation = `Jump not taken (ZF=1).`;
      }
      disassembly = `JNE 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x72: { // JB / JC
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.flags.cf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JC 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x73: { // JAE / JNC
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (!state.registers.flags.cf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JNC 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x76: { // JBE / JNA: (CF=1 or ZF=1)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.flags.cf || state.registers.flags.zf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JBE 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x77: { // JA / JNBE: (CF=0 and ZF=0)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (!state.registers.flags.cf && !state.registers.flags.zf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JA 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x70: { // JO (Overflow: OF=1)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.flags.of) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JO 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x71: { // JNO (Not Overflow: OF=0)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (!state.registers.flags.of) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JNO 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x78: { // JS (Sign negative: SF=1)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.flags.sf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JS 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x79: { // JNS (Sign positive: SF=0)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (!state.registers.flags.sf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JNS 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x7A: { // JP / JPE (Parity even: PF=1)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.flags.pf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JP 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x7B: { // JNP / JPO (Parity odd: PF=0)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (!state.registers.flags.pf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JNP 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x7C: { // JL / JNGE: (SF != OF)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.flags.sf !== state.registers.flags.of) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JL 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x7D: { // JGE / JNL: (SF == OF)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.flags.sf === state.registers.flags.of) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JGE 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x7E: { // JLE / JNG: (ZF=1 or SF != OF)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.flags.zf || (state.registers.flags.sf !== state.registers.flags.of)) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JLE 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0x7F: { // JG / JNLE: (ZF=0 and SF == OF)
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (!state.registers.flags.zf && (state.registers.flags.sf === state.registers.flags.of)) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JG 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 16;
      break;
    }

    case 0xE0: { // LOOPNZ / LOOPNE: CX--, if CX != 0 and ZF == 0 goto target
      state.registers.cx = (state.registers.cx - 1) & 0xFFFF;
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.cx !== 0 && !state.registers.flags.zf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `LOOPNZ 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 19;
      break;
    }

    case 0xE1: { // LOOPZ / LOOPE: CX--, if CX != 0 and ZF == 1 goto target
      state.registers.cx = (state.registers.cx - 1) & 0xFFFF;
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.cx !== 0 && state.registers.flags.zf) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `LOOPZ 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 18;
      break;
    }

    case 0xE3: { // JCXZ: if CX == 0 goto target
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.cx === 0) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
      } else {
        ipAdvance = 2;
      }
      disassembly = `JCXZ 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 18;
      break;
    }

    case 0xE2: { // LOOP rel8: CX--, if CX != 0 goto target
      state.registers.cx = (state.registers.cx - 1) & 0xFFFF;
      const rel8 = (readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF) << 24) >> 24;
      if (state.registers.cx !== 0) {
        state.registers.ip = (startIP + 2 + rel8) & 0xFFFF;
        ipAdvance = 0;
        explanation = `Loop count CX = ${state.registers.cx} (CX != 0, Jump taken).`;
      } else {
        ipAdvance = 2;
        explanation = `Loop finished (CX = 0, Fall through).`;
      }
      disassembly = `LOOP 0x${((startIP + 2 + rel8) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      cyclesUsed = 17;
      break;
    }

    case 0xE8: { // CALL rel16
      const rel16 = fetchImm16();
      const returnAddr = (startIP + 3) & 0xFFFF;
      pushStack(state, returnAddr);
      state.registers.ip = (startIP + 3 + ((rel16 << 16) >> 16)) & 0xFFFF;
      ipAdvance = 0;
      disassembly = `CALL 0x${state.registers.ip.toString(16).toUpperCase().padStart(4, '0')}`;
      explanation = `Called procedure at 0x${state.registers.ip.toString(16).toUpperCase()}. Pushed return IP = 0x${returnAddr.toString(16).toUpperCase()}.`;
      cyclesUsed = 19;
      break;
    }

    case 0xCD: { // INT imm8
      const intNum = fetchImm8();
      ipAdvance = 2;
      disassembly = `INT 0x${intNum.toString(16).toUpperCase()}`;

      // Simulate DOS INT 21H service routines
      if (intNum === 0x21) {
        const ah = (state.registers.ax >> 8) & 0xFF;
        if (ah === 0x02) { // Display character in DL
          const char = String.fromCharCode(state.registers.dx & 0xFF);
          state.virtualIo.terminalOutput += char;
          explanation = `DOS INT 21H AH=02h: Output char '${char}'.`;
        } else if (ah === 0x09) { // Display $-terminated string at DS:DX
          let str = '';
          let offset = state.registers.dx;
          while (offset < 0xFFFF) {
            const charCode = readMem8(state.memory, state.registers.ds, offset);
            if (charCode === 0x24) break; // '$'
            str += String.fromCharCode(charCode);
            offset++;
          }
          state.virtualIo.terminalOutput += str;
          explanation = `DOS INT 21H AH=09h: Output string "${str}".`;
        } else if (ah === 0x4C) { // Terminate program
          state.halted = true;
          explanation = `DOS INT 21H AH=4Ch: Program terminated with exit code ${state.registers.ax & 0xFF}.`;
        }
      }
      cyclesUsed = 52;
      break;
    }

    // ── Port I/O Instructions (IN / OUT) ───────────────────────────────────
    case 0xE4: { // IN AL, imm8
      const port = fetchImm8();
      ipAdvance = 2;
      const val = state.ioPorts[port] ?? 0;
      setReg8(state.registers, 'AL', val);
      disassembly = `IN AL, 0x${port.toString(16).toUpperCase()}`;
      explanation = `Read 0x${val.toString(16).toUpperCase()} from I/O Port 0x${port.toString(16).toUpperCase()} into AL.`;
      cyclesUsed = 10;
      break;
    }

    case 0xE6: { // OUT imm8, AL
      const port = fetchImm8();
      ipAdvance = 2;
      const val = getReg8(state.registers, 'AL');
      state.ioPorts[port] = val;

      // Virtual Device Interfacing
      if (port === 0x80) state.virtualIo.ledBar = val;
      else if (port === 0x90) state.virtualIo.sevenSegmentLow = val;
      else if (port === 0x91) state.virtualIo.sevenSegmentHigh = val;
      else if (port === 0xA0) state.virtualIo.terminalOutput += String.fromCharCode(val);

      disassembly = `OUT 0x${port.toString(16).toUpperCase()}, AL`;
      explanation = `Wrote AL(0x${val.toString(16).toUpperCase()}) to I/O Port 0x${port.toString(16).toUpperCase()}.`;
      cyclesUsed = 10;
      break;
    }

    // ── XCHG reg16, AX (0x91..0x97) or XCHG reg, reg/mem (0x86, 0x87) ──
    case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97: {
      const regIdx = opcode - 0x90;
      const regName = reg16Names[regIdx];
      const tmp = state.registers.ax;
      state.registers.ax = getReg16(state.registers, regName);
      setReg16(state.registers, regName, tmp);
      disassembly = `XCHG AX, ${regName}`;
      explanation = `Exchanged AX with ${regName}.`;
      ipAdvance = 1;
      cyclesUsed = 3;
      break;
    }

    case 0x86: case 0x87: {
      const modRM = readMem8(state.memory, state.registers.cs, (startIP + 1) & 0xFFFF);
      const mod = (modRM >> 6) & 0x03;
      const reg = (modRM >> 3) & 0x07;
      const rm = modRM & 0x07;
      const isWord = opcode === 0x87;
      if (mod === 3) {
        if (isWord) {
          const r1 = reg16Names[reg];
          const r2 = reg16Names[rm];
          const tmp = getReg16(state.registers, r1);
          setReg16(state.registers, r1, getReg16(state.registers, r2));
          setReg16(state.registers, r2, tmp);
          disassembly = `XCHG ${r2}, ${r1}`;
          explanation = `Exchanged ${r1} with ${r2}.`;
        } else {
          const r1 = reg8Names[reg];
          const r2 = reg8Names[rm];
          const tmp = getReg8(state.registers, r1);
          setReg8(state.registers, r1, getReg8(state.registers, r2));
          setReg8(state.registers, r2, tmp);
          disassembly = `XCHG ${r2}, ${r1}`;
          explanation = `Exchanged ${r1} with ${r2}.`;
        }
        ipAdvance = 2;
      }
      cyclesUsed = 4;
      break;
    }

    default: {
      disassembly = `DB 0x${opcode.toString(16).toUpperCase()}`;
      explanation = `Unknown opcode 0x${opcode.toString(16).toUpperCase()}. Advanced IP.`;
      ipAdvance = 1;
      cyclesUsed = 4;
      break;
    }
  }

  // Consume queue bytes and advance IP
  if (ipAdvance > 0) {
    state.registers.ip = (state.registers.ip + ipAdvance) & 0xFFFF;
    state.queue.splice(0, Math.min(ipAdvance, state.queue.length));
  } else {
    // Branch taken => flush queue
    state.queue = [];
  }

  // Refill queue
  refillQueue(state);

  // Update counters & bus cycle
  state.cycles += cyclesUsed;
  state.instructionsExecuted += 1;
  state.currentOpcode = opcode;
  state.currentDisassembly = disassembly;
  state.currentPhysicalAddress = startPhysical;
  state.microOpDescription = explanation;

  state.busCycle = {
    tState: 'T4',
    ale: false,
    m_io: true,
    rd: true,
    wr: false,
    dt_r: true,
    den: false,
    addressBus: startPhysical,
    dataBus: opcode,
  };

  // Add to execution trace history
  const traceItem: TraceStep8086 = {
    stepIndex: state.instructionsExecuted,
    cs: state.registers.cs,
    ip: startIP,
    physicalAddress: startPhysical,
    instructionHex: `0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`,
    disassembly,
    registersBefore: regsBefore,
    registersAfter: { ...state.registers, flags: { ...state.registers.flags } },
    flagsBefore,
    flagsAfter: { ...state.registers.flags },
    explanation,
  };

  state.trace.push(traceItem);
  if (state.trace.length > 200) state.trace.shift(); // Keep recent 200 steps

  return state;
}

/**
 * Runs CPU until halted or max steps reached, returning total cycles
 */
export function run8086UntilHalt(state: CPU8086State, maxSteps: number = 10000): number {
  let steps = 0;
  while (!state.halted && steps < maxSteps) {
    step8086(state);
    steps++;
  }
  return state.cycles;
}

/**
 * Runs CPU until halted, breakpoint hit, or maximum cycle limit reached (watchdog protection)
 */
export function run8086(state: CPU8086State, maxSteps: number = 5000): { state: CPU8086State; hitBreakpoint: boolean } {
  let steps = 0;
  let hitBreakpoint = false;

  while (!state.halted && steps < maxSteps) {
    const currentPhys = calculatePhysicalAddress(state.registers.cs, state.registers.ip);

    // Check address breakpoints
    if (state.breakpoints.has(currentPhys) || state.breakpoints.has(state.registers.ip)) {
      hitBreakpoint = true;
      break;
    }

    // Check conditional breakpoints
    const cond = state.conditionalBreakpoints.get(currentPhys) || state.conditionalBreakpoints.get(state.registers.ip);
    if (cond && evaluateBreakpointCondition(cond, state.registers)) {
      hitBreakpoint = true;
      break;
    }

    step8086(state);
    steps++;
  }

  return { state, hitBreakpoint };
}

/**
 * Evaluates conditional breakpoint strings (e.g. "AX == 10H", "ZF == 1", "CX == 0")
 */
export function evaluateBreakpointCondition(cond: string, regs: Registers8086): boolean {
  try {
    const clean = cond.trim().toUpperCase();
    if (clean.includes('AX ==')) {
      const target = parseInt(clean.split('==')[1].trim().replace(/H$/, ''), 16);
      return regs.ax === target;
    }
    if (clean.includes('BX ==')) {
      const target = parseInt(clean.split('==')[1].trim().replace(/H$/, ''), 16);
      return regs.bx === target;
    }
    if (clean.includes('CX ==')) {
      const target = parseInt(clean.split('==')[1].trim().replace(/H$/, ''), 16);
      return regs.cx === target;
    }
    if (clean.includes('DX ==')) {
      const target = parseInt(clean.split('==')[1].trim().replace(/H$/, ''), 16);
      return regs.dx === target;
    }
    if (clean.includes('ZF == 1')) return regs.flags.zf;
    if (clean.includes('CF == 1')) return regs.flags.cf;
    if (clean.includes('OF == 1')) return regs.flags.of;
    return false;
  } catch {
    return false;
  }
}
