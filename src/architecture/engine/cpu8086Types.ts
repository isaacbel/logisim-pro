/**
 * Intel 8086 Processor Architectural Types & State Models
 * Complete 16-bit register file, 1MB memory subsystem, 6-byte instruction queue,
 * 16-bit flags register, I/O space, and BIU/EU hardware control definitions.
 */

export interface Flags8086 {
  cf: boolean; // Bit 0: Carry Flag
  pf: boolean; // Bit 2: Parity Flag (low 8 bits even parity)
  af: boolean; // Bit 4: Auxiliary Carry Flag (nibble BCD carry)
  zf: boolean; // Bit 6: Zero Flag
  sf: boolean; // Bit 7: Sign Flag (MSB is 1)
  tf: boolean; // Bit 8: Trap / Single Step Flag
  if: boolean; // Bit 9: Interrupt Enable Flag
  df: boolean; // Bit 10: Direction Flag (0=up/increment, 1=down/decrement)
  of: boolean; // Bit 11: Overflow Flag (Signed 2's complement overflow)
}

export interface Registers8086 {
  // General Purpose 16-bit
  ax: number;
  bx: number;
  cx: number;
  dx: number;

  // Pointer & Index 16-bit
  sp: number;
  bp: number;
  si: number;
  di: number;

  // Segment Registers 16-bit
  cs: number;
  ds: number;
  ss: number;
  es: number;

  // Special Registers
  ip: number;
  flags: Flags8086;
}

export type GeneralReg16 = 'AX' | 'BX' | 'CX' | 'DX' | 'SP' | 'BP' | 'SI' | 'DI';
export type SegmentReg = 'CS' | 'DS' | 'SS' | 'ES';
export type ByteReg = 'AL' | 'AH' | 'BL' | 'BH' | 'CL' | 'CH' | 'DL' | 'DH';
export type Reg8086Name = GeneralReg16 | SegmentReg | ByteReg | 'IP' | 'FLAGS';

export type TState = 'T1' | 'T2' | 'T3' | 'T4' | 'Tw' | 'Ti';

export interface BusCycle8086 {
  tState: TState;
  ale: boolean;     // Address Latch Enable
  m_io: boolean;    // Memory (1) / IO (0)
  rd: boolean;      // Read active low (simulated active high signal boolean)
  wr: boolean;      // Write active low
  dt_r: boolean;    // Data Transmit / Receive
  den: boolean;     // Data Enable
  addressBus: number; // 20-bit address
  dataBus: number;    // 16-bit / 8-bit data
}

export interface TraceStep8086 {
  stepIndex: number;
  cs: number;
  ip: number;
  physicalAddress: number;
  instructionHex: string;
  disassembly: string;
  registersBefore: Registers8086;
  registersAfter: Registers8086;
  flagsBefore: Flags8086;
  flagsAfter: Flags8086;
  explanation: string;
}

export interface VirtualIoState {
  ledBar: number;           // Port 80H (8-bit LEDs)
  sevenSegmentLow: number;  // Port 90H (Digit 0)
  sevenSegmentHigh: number; // Port 91H (Digit 1)
  terminalOutput: string;   // Port 0A0H (ASCII Console Out)
  dipSwitches: number;      // Port 0A2H (8-bit Input switches)
  timerTicks: number;       // Port 60H (Timer counter)
}

export interface CPU8086State {
  // Registers
  registers: Registers8086;

  // Physical Memory (1MB Address Space: 00000H..FFFFFH)
  memory: Uint8Array;

  // BIU 6-Byte FIFO Instruction Queue
  queue: number[];

  // Execution Unit Control
  halted: boolean;
  running: boolean;
  cycles: number;
  instructionsExecuted: number;

  // Current Instruction State
  currentOpcode: number;
  currentDisassembly: string;
  currentPhysicalAddress: number;

  // BIU / EU Bus Signals
  busCycle: BusCycle8086;

  // I/O Subsystem
  ioPorts: Uint8Array;
  virtualIo: VirtualIoState;

  // Debugger Support
  breakpoints: Set<number>; // Physical Addresses or CS:IP offsets
  conditionalBreakpoints: Map<number, string>; // addr -> condition expression (e.g. 'AX == 1000H')
  watchExpressions: string[];
  trace: TraceStep8086[];

  // Active micro-operations description
  microOpDescription: string;
}

/**
 * Packs a Flags8086 object into a standard 16-bit 8086 FLAGS word
 */
export function flagsToWord(f: Flags8086): number {
  let word = 0x0002; // Bit 1 is always 1 in 8086 FLAGS
  if (f.cf) word |= (1 << 0);
  if (f.pf) word |= (1 << 2);
  if (f.af) word |= (1 << 4);
  if (f.zf) word |= (1 << 6);
  if (f.sf) word |= (1 << 7);
  if (f.tf) word |= (1 << 8);
  if (f.if) word |= (1 << 9);
  if (f.df) word |= (1 << 10);
  if (f.of) word |= (1 << 11);
  return word & 0xFFFF;
}

/**
 * Unpacks a 16-bit 8086 FLAGS word into a Flags8086 object
 */
export function wordToFlags(word: number): Flags8086 {
  return {
    cf: (word & (1 << 0)) !== 0,
    pf: (word & (1 << 2)) !== 0,
    af: (word & (1 << 4)) !== 0,
    zf: (word & (1 << 6)) !== 0,
    sf: (word & (1 << 7)) !== 0,
    tf: (word & (1 << 8)) !== 0,
    if: (word & (1 << 9)) !== 0,
    df: (word & (1 << 10)) !== 0,
    of: (word & (1 << 11)) !== 0,
  };
}

/**
 * Computes 20-bit 8086 Physical Address: (Segment * 16) + Offset
 */
export function calculatePhysicalAddress(segment: number, offset: number): number {
  return (((segment & 0xFFFF) << 4) + (offset & 0xFFFF)) & 0xFFFFF;
}

export const getPhysicalAddress = calculatePhysicalAddress;

/**
 * Reads a register value from CPU state
 */
export function readReg8086(state: CPU8086State, regName: string): number {
  const n = regName.toUpperCase();
  const regs = state.registers;
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

/**
 * Writes a register value into CPU state
 */
export function writeReg8086(state: CPU8086State, regName: string, val: number): void {
  const n = regName.toUpperCase();
  const regs = state.registers;
  switch (n) {
    case 'AX': regs.ax = val & 0xFFFF; break;
    case 'BX': regs.bx = val & 0xFFFF; break;
    case 'CX': regs.cx = val & 0xFFFF; break;
    case 'DX': regs.dx = val & 0xFFFF; break;
    case 'SP': regs.sp = val & 0xFFFF; break;
    case 'BP': regs.bp = val & 0xFFFF; break;
    case 'SI': regs.si = val & 0xFFFF; break;
    case 'DI': regs.di = val & 0xFFFF; break;
    case 'CS': regs.cs = val & 0xFFFF; break;
    case 'DS': regs.ds = val & 0xFFFF; break;
    case 'SS': regs.ss = val & 0xFFFF; break;
    case 'ES': regs.es = val & 0xFFFF; break;
    case 'IP': regs.ip = val & 0xFFFF; break;
    case 'FLAGS': regs.flags = wordToFlags(val & 0xFFFF); break;
    case 'AL': regs.ax = (regs.ax & 0xFF00) | (val & 0xFF); break;
    case 'AH': regs.ax = (regs.ax & 0x00FF) | ((val & 0xFF) << 8); break;
    case 'BL': regs.bx = (regs.bx & 0xFF00) | (val & 0xFF); break;
    case 'BH': regs.bx = (regs.bx & 0x00FF) | ((val & 0xFF) << 8); break;
    case 'CL': regs.cx = (regs.cx & 0xFF00) | (val & 0xFF); break;
    case 'CH': regs.cx = (regs.cx & 0x00FF) | ((val & 0xFF) << 8); break;
    case 'DL': regs.dx = (regs.dx & 0xFF00) | (val & 0xFF); break;
    case 'DH': regs.dx = (regs.dx & 0x00FF) | ((val & 0xFF) << 8); break;
  }
}

/**
 * Reads 16-bit word from physical address in little-endian order
 */
export function readMem16(state: CPU8086State, physAddr: number): number {
  const low = state.memory[physAddr & 0xFFFFF] ?? 0;
  const high = state.memory[(physAddr + 1) & 0xFFFFF] ?? 0;
  return (low | (high << 8)) & 0xFFFF;
}

/**
 * Writes 16-bit word to physical address in little-endian order
 */
export function writeMem16(state: CPU8086State, physAddr: number, val: number): void {
  state.memory[physAddr & 0xFFFFF] = val & 0xFF;
  state.memory[(physAddr + 1) & 0xFFFFF] = (val >> 8) & 0xFF;
}

/**
 * Formats segment and offset into SEGMENT:OFFSET (e.g. 1000:0100)
 */
export function formatSegmentOffset(segment: number, offset: number): string {
  return `${(segment & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}:${(offset & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * Creates initial 8086 CPU State
 */
export function createInitial8086State(codeBytes: number[] = [], loadSegment: number = 0x0700, loadOffset: number = 0x0100): CPU8086State {
  const memory = new Uint8Array(1048576); // 1 MB
  const ioPorts = new Uint8Array(65536);   // 64 KB

  // Load code bytes into memory at loadSegment:loadOffset
  const startPhysical = calculatePhysicalAddress(loadSegment, loadOffset);
  for (let i = 0; i < codeBytes.length; i++) {
    memory[(startPhysical + i) & 0xFFFFF] = codeBytes[i] & 0xFF;
  }

  // Preload first up to 6 bytes into queue
  const initialQueue: number[] = [];
  for (let i = 0; i < Math.min(6, codeBytes.length); i++) {
    initialQueue.push(codeBytes[i] & 0xFF);
  }

  const initialFlags: Flags8086 = {
    cf: false,
    pf: false,
    af: false,
    zf: false,
    sf: false,
    tf: false,
    if: true, // Interrupts enabled by default
    df: false,
    of: false,
  };

  const registers: Registers8086 = {
    ax: 0x0000,
    bx: 0x0000,
    cx: 0x0000,
    dx: 0x0000,
    sp: 0xFFFE, // Stack top
    bp: 0x0000,
    si: 0x0000,
    di: 0x0000,
    cs: loadSegment,
    ds: loadSegment,
    ss: loadSegment,
    es: loadSegment,
    ip: loadOffset,
    flags: initialFlags,
  };

  const virtualIo: VirtualIoState = {
    ledBar: 0x00,
    sevenSegmentLow: 0x00,
    sevenSegmentHigh: 0x00,
    terminalOutput: '',
    dipSwitches: 0x00,
    timerTicks: 0,
  };

  const busCycle: BusCycle8086 = {
    tState: 'T1',
    ale: true,
    m_io: true,
    rd: true,
    wr: false,
    dt_r: false,
    den: true,
    addressBus: startPhysical,
    dataBus: codeBytes[0] ?? 0,
  };

  return {
    registers,
    memory,
    queue: initialQueue,
    halted: false,
    running: false,
    cycles: 0,
    instructionsExecuted: 0,
    currentOpcode: codeBytes[0] ?? 0x90,
    currentDisassembly: 'NOP',
    currentPhysicalAddress: startPhysical,
    busCycle,
    ioPorts,
    virtualIo,
    breakpoints: new Set<number>(),
    conditionalBreakpoints: new Map<number, string>(),
    watchExpressions: ['AX', 'BX', 'CX', 'DX', 'CS:IP', 'SS:SP', 'FLAGS'],
    trace: [],
    microOpDescription: 'System initialized. BIU Prefetched initial bytes into instruction queue.',
  };
}
