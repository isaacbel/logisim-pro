/**
 * 16-bit Educational CPU Assembler and Disassembler
 */

import { INSTRUCTION_SET } from './controlUnitEngine';

export interface AssembledLine {
  address: number;
  sourceLine: string;
  lineNumber: number;
  machineCode: number;
  hex: string;
  bin: string;
  isLabelOnly: boolean;
  label?: string;
  error?: string;
}

export interface AssemblyResult {
  success: boolean;
  listing: AssembledLine[];
  machineCode: number[];
  symbolTable: Record<string, number>;
  errors: { line: number; message: string }[];
}

export const SAMPLE_PROGRAMS = [
  {
    name: '1. Fibonacci Sequence',
    description: 'Computes first N terms of the Fibonacci sequence and stores results in registers and RAM.',
    code: `; Fibonacci Sequence Program (N terms)
; R0 = 0 (Constant Zero)
; R1 = F0 = 0
; R2 = F1 = 1
; R3 = Counter / Limit
; R4 = Next term Fn

      ADDI R1, R0, 0     ; R1 = F(0) = 0
      ADDI R2, R0, 1     ; R2 = F(1) = 1
      ADDI R3, R0, 7     ; Compute 7 terms
      ADDI R5, R0, 0     ; RAM pointer = 0

LOOP: STORE R1, [R5]     ; Write Fn to RAM[R5]
      ADD  R4, R1, R2    ; R4 = R1 + R2
      ADDI R1, R2, 0     ; R1 = R2
      ADDI R2, R4, 0     ; R2 = R4
      ADDI R5, R5, 1     ; RAM pointer++
      SUB  R3, R3, R2    ; Decrement counter
      BNE  R3, R0, LOOP  ; Loop while R3 != 0
      HALT               ; Terminate execution
`,
  },
  {
    name: '2. Arithmetic Sum 1 to N',
    description: 'Calculates the arithmetic sum 1 + 2 + 3 + ... + N and stores the final result in RAM[0].',
    code: `; Arithmetic Sum 1..N
; R1 = N = 10
; R2 = Cumulative Sum
; R3 = Decrement step = 1

      ADDI R1, R0, 10    ; N = 10
      ADDI R2, R0, 0     ; Sum = 0
      ADDI R3, R0, 1     ; Step = 1

LOOP: ADD  R2, R2, R1    ; Sum += N
      SUB  R1, R1, R3    ; N--
      BNE  R1, R0, LOOP  ; if (N != 0) goto LOOP
      STORE R2, [0]      ; RAM[0] = final sum (55)
      HALT
`,
  },
  {
    name: '3. Maximum of Two Numbers',
    description: 'Compares two operands A and B and stores the maximum value in R1.',
    code: `; Maximum of Two Numbers: R1 = Max(A, B)
      ADDI R1, R0, 15    ; A = 15
      ADDI R2, R0, 45    ; B = 45
      SUB  R3, R1, R2    ; R3 = A - B
      BEQ  R3, R0, END   ; If A == B, done
      SUB  R4, R2, R1    ; R4 = B - A
      ADDI R1, R2, 0     ; If B > A, R1 = B
END:  STORE R1, [0]      ; RAM[0] = 45
      HALT
`,
  },
  {
    name: '4. Repeated Addition Multiplication',
    description: 'Computes the product A × B without dedicated hardware multiplication.',
    code: `; Multiplication: R4 = R1 × R2 (6 × 7 = 42)
      ADDI R1, R0, 6     ; Multiplicand A = 6
      ADDI R2, R0, 7     ; Multiplier B = 7
      ADDI R3, R0, 1     ; Decrement = 1
      ADDI R4, R0, 0     ; Product = 0

MULT: BEQ  R2, R0, DONE  ; If B == 0, finish
      ADD  R4, R4, R1    ; Product += A
      SUB  R2, R2, R3    ; B--
      JMP  MULT          ; Repeat
DONE: STORE R4, [0]      ; RAM[0] = 42
      HALT
`,
  },
];

/**
 * Parses register tokens (e.g. 'R0'..'R7', 'r0'..'r7')
 */
function parseRegister(token: string): number | null {
  const match = token.trim().match(/^[rR]([0-7])$/);
  if (!match) return null;
  return parseInt(match[1]);
}

/**
 * Parses numeric immediate or memory offset (decimal, 0x hex, 0b bin)
 */
function parseImmediate(token: string): number | null {
  const clean = token.trim().replace(/^\[/, '').replace(/\]$/, '');
  if (/^0x[0-9a-fA-F]+$/i.test(clean)) return parseInt(clean, 16);
  if (/^0b[01]+$/i.test(clean)) return parseInt(clean.slice(2), 2);
  if (/^-?\d+$/.test(clean)) return parseInt(clean, 10);
  return null;
}

/**
 * Assembles assembly source code into machine code
 */
export function assembleProgram(sourceCode: string): AssemblyResult {
  const lines = sourceCode.split('\n');
  const symbolTable: Record<string, number> = {};
  const errors: { line: number; message: string }[] = [];
  const parsedLines: { lineNumber: number; raw: string; label?: string; mnemonic?: string; args: string[] }[] = [];

  let currentAddress = 0;

  // ── PASS 1: Symbol Table & Label Collection ───────────────────────────────
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    // Strip comments
    const noComment = lineText.split(';')[0].trim();
    if (!noComment) return;

    let text = noComment;
    let label: string | undefined;

    // Check for label prefix (e.g. 'LOOP:' or 'START:')
    const labelMatch = text.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    if (labelMatch) {
      label = labelMatch[1].toUpperCase();
      symbolTable[label] = currentAddress;
      text = text.slice(labelMatch[0].length).trim();
    }

    if (!text) {
      // Label-only line
      parsedLines.push({ lineNumber: lineNum, raw: lineText, label, args: [] });
      return;
    }

    const tokens = text.split(/[\s,]+/).filter(t => t.length > 0);
    const mnemonic = tokens[0].toUpperCase();
    const args = tokens.slice(1);

    parsedLines.push({
      lineNumber: lineNum,
      raw: lineText,
      label,
      mnemonic,
      args,
    });

    currentAddress++;
  });

  // ── PASS 2: Instruction Encoding ──────────────────────────────────────────
  const listing: AssembledLine[] = [];
  const machineCode: number[] = [];
  let addrCounter = 0;

  for (const item of parsedLines) {
    if (!item.mnemonic) {
      listing.push({
        address: addrCounter,
        sourceLine: item.raw,
        lineNumber: item.lineNumber,
        machineCode: 0,
        hex: '------',
        bin: '----------------',
        isLabelOnly: true,
        label: item.label,
      });
      continue;
    }

    const instDef = INSTRUCTION_SET.find(i => i.mnemonic === item.mnemonic);
    if (!instDef) {
      errors.push({ line: item.lineNumber, message: `Unknown instruction: "${item.mnemonic}"` });
      continue;
    }

    const opcode = instDef.opcode & 0x0F;
    let rd = 0;
    let rs = 0;
    let rtOrImm = 0;

    if (instDef.type === 'R') {
      // R-Type: ADD Rd, Rs, Rt or NOT Rd, Rs
      if (item.mnemonic === 'NOT' || item.mnemonic === 'SHL' || item.mnemonic === 'SHR') {
        const d = parseRegister(item.args[0] ?? '');
        const s = parseRegister(item.args[1] ?? '');
        if (d === null || s === null) {
          errors.push({ line: item.lineNumber, message: `Expected syntax: ${item.mnemonic} Rd, Rs` });
          continue;
        }
        rd = d;
        rs = s;
        rtOrImm = 0;
      } else {
        const d = parseRegister(item.args[0] ?? '');
        const s = parseRegister(item.args[1] ?? '');
        const t = parseRegister(item.args[2] ?? '');
        if (d === null || s === null || t === null) {
          errors.push({ line: item.lineNumber, message: `Expected syntax: ${item.mnemonic} Rd, Rs, Rt` });
          continue;
        }
        rd = d;
        rs = s;
        rtOrImm = t;
      }
    } else if (instDef.type === 'I') {
      // I-Type: ADDI Rd, Rs, imm | LOAD Rd, [addr] | STORE Rs, [addr] | BEQ Rs, Rt, target
      if (item.mnemonic === 'ADDI') {
        const d = parseRegister(item.args[0] ?? '');
        const s = parseRegister(item.args[1] ?? '');
        const imm = parseImmediate(item.args[2] ?? '');
        if (d === null || s === null || imm === null) {
          errors.push({ line: item.lineNumber, message: `Expected syntax: ADDI Rd, Rs, imm` });
          continue;
        }
        rd = d;
        rs = s;
        rtOrImm = imm & 0x3F; // 6-bit immediate
      } else if (item.mnemonic === 'LOAD') {
        const d = parseRegister(item.args[0] ?? '');
        const rawAddr = (item.args[1] ?? '').trim().replace(/^\[/, '').replace(/\]$/, '');
        const regAddr = parseRegister(rawAddr);
        const imm = parseImmediate(rawAddr);
        if (d === null || (regAddr === null && imm === null)) {
          errors.push({ line: item.lineNumber, message: `Expected syntax: LOAD Rd, [addr|Rx]` });
          continue;
        }
        rd = d;
        if (regAddr !== null) {
          rs = regAddr;
          rtOrImm = 0;
        } else {
          rs = 0;
          rtOrImm = (imm ?? 0) & 0x3F;
        }
      } else if (item.mnemonic === 'STORE') {
        const s = parseRegister(item.args[0] ?? '');
        const rawAddr = (item.args[1] ?? '').trim().replace(/^\[/, '').replace(/\]$/, '');
        const regAddr = parseRegister(rawAddr);
        const imm = parseImmediate(rawAddr);
        if (s === null || (regAddr === null && imm === null)) {
          errors.push({ line: item.lineNumber, message: `Expected syntax: STORE Rs, [addr|Rx]` });
          continue;
        }
        rs = s;
        if (regAddr !== null) {
          rd = regAddr;
          rtOrImm = 0;
        } else {
          rd = 0;
          rtOrImm = (imm ?? 0) & 0x3F;
        }
      } else if (item.mnemonic === 'BEQ' || item.mnemonic === 'BNE') {
        const s = parseRegister(item.args[0] ?? '');
        const t = parseRegister(item.args[1] ?? '');
        const targetLabel = item.args[2]?.toUpperCase();
        let targetAddr = symbolTable[targetLabel];
        if (targetAddr === undefined) {
          targetAddr = parseImmediate(item.args[2] ?? '') ?? 0;
        }
        if (s === null || t === null) {
          errors.push({ line: item.lineNumber, message: `Expected syntax: ${item.mnemonic} Rs, Rt, target` });
          continue;
        }
        rd = t; // store Rt in Rd field for BEQ/BNE comparison
        rs = s;
        rtOrImm = targetAddr & 0x3F;
      }
    } else {
      // J-Type: JMP target | HALT | NOP
      if (item.mnemonic === 'JMP') {
        const targetLabel = item.args[0]?.toUpperCase();
        let targetAddr = symbolTable[targetLabel];
        if (targetAddr === undefined) {
          targetAddr = parseImmediate(item.args[0] ?? '') ?? 0;
        }
        rd = 0;
        rs = 0;
        rtOrImm = targetAddr & 0x3F;
      }
    }

    // Pack into 16-bit word: [Opcode (4)][Rd (3)][Rs (3)][Rt/Imm (6)]
    const word = ((opcode & 0x0F) << 12) | ((rd & 0x07) << 9) | ((rs & 0x07) << 6) | (rtOrImm & 0x3F);

    machineCode.push(word);
    listing.push({
      address: addrCounter,
      sourceLine: item.raw,
      lineNumber: item.lineNumber,
      machineCode: word,
      hex: `0x${word.toString(16).toUpperCase().padStart(4, '0')}`,
      bin: word.toString(2).padStart(16, '0'),
      isLabelOnly: false,
      label: item.label,
    });

    addrCounter++;
  }

  return {
    success: errors.length === 0,
    listing,
    machineCode,
    symbolTable,
    errors,
  };
}

/**
 * Disassembles 16-bit machine word into human readable assembly
 */
export function disassembleWord(word: number): string {
  const opcode = (word >> 12) & 0x0F;
  const rd = (word >> 9) & 0x07;
  const rs = (word >> 6) & 0x07;
  const rtOrImm = word & 0x3F;

  const inst = INSTRUCTION_SET.find(i => i.opcode === opcode);
  if (!inst) return `UNKNOWN (0x${word.toString(16)})`;

  switch (inst.mnemonic) {
    case 'NOP':
    case 'HALT':
      return inst.mnemonic;
    case 'NOT':
    case 'SHL':
    case 'SHR':
      return `${inst.mnemonic} R${rd}, R${rs}`;
    case 'ADD':
    case 'SUB':
    case 'AND':
    case 'OR':
    case 'XOR':
      return `${inst.mnemonic} R${rd}, R${rs}, R${rtOrImm}`;
    case 'ADDI':
      return `ADDI R${rd}, R${rs}, ${rtOrImm}`;
    case 'LOAD':
      return `LOAD R${rd}, [${rtOrImm}]`;
    case 'STORE':
      return `STORE R${rs}, [${rtOrImm}]`;
    case 'BEQ':
    case 'BNE':
      return `${inst.mnemonic} R${rs}, R${rd}, ${rtOrImm}`;
    case 'JMP':
      return `JMP ${rtOrImm}`;
    default:
      return `${inst.mnemonic} R${rd}, R${rs}, ${rtOrImm}`;
  }
}
