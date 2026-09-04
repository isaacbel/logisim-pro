/**
 * Intel 8086 Two-Pass Assembler and Disassembler
 * Generates genuine 8086 machine code encodings for the 8086 instruction set architecture.
 */

export interface Assembled8086Line {
  address: number;      // Offset within code segment
  segment: number;      // Segment base (e.g. 0x0700)
  physicalAddress: number; // 20-bit address
  sourceLine: string;
  lineNumber: number;
  machineBytes: number[];
  hex: string;
  isLabelOnly: boolean;
  label?: string;
  error?: string;
}

export interface Assembly8086Result {
  success: boolean;
  listing: Assembled8086Line[];
  machineCode: number[];
  symbolTable: Record<string, number>;
  codeSegment: number;
  dataSegment: number;
  startOffset: number;
  errors: { line: number; message: string }[];
}

export const REG16_CODES: Record<string, number> = {
  AX: 0, CX: 1, DX: 2, BX: 3, SP: 4, BP: 5, SI: 6, DI: 7,
};

export const REG8_CODES: Record<string, number> = {
  AL: 0, CL: 1, DL: 2, BL: 3, AH: 4, CH: 5, DH: 6, BH: 7,
};

export const SEG_CODES: Record<string, number> = {
  ES: 0, CS: 1, SS: 2, DS: 3,
};

export const SAMPLE_8086_PROGRAMS = [
  {
    id: 'fibonacci',
    name: '1. Fibonacci Sequence (16-bit)',
    description: 'Computes the first 8 Fibonacci numbers in registers and stores them into Data Segment array.',
    code: `; ==========================================
; Program: 16-bit Fibonacci Sequence Generator
; Generates Fibonacci numbers into Data Segment
; ==========================================
.DATA
  FIB_ARRAY  DW 8 DUP(0)

.CODE
  MOV AX, 0000H     ; F(0) = 0
  MOV BX, 0001H     ; F(1) = 1
  MOV CX, 0008H     ; Generate 8 terms
  MOV SI, 0000H     ; Array offset index

FIB_LOOP:
  MOV [SI], AX      ; Store current term in RAM
  MOV DX, AX        ; DX = AX
  ADD DX, BX        ; DX = AX + BX (Next term)
  MOV AX, BX        ; AX = F(n-1)
  MOV BX, DX        ; BX = F(n)
  ADD SI, 0002H     ; Point to next 16-bit word
  LOOP FIB_LOOP     ; Decrement CX, loop if CX != 0

  HLT               ; Halt CPU execution
`,
  },
  {
    id: 'array_sum',
    name: '2. Array Summation & Average',
    description: 'Iterates through an array of numbers, accumulates total sum into AX and computes average in BX.',
    code: `; ==========================================
; Program: Array Summation and Average
; ==========================================
.DATA
  NUMBERS  DW 10H, 20H, 30H, 40H, 50H

.CODE
  MOV SI, 0000H     ; SI = Array base pointer
  MOV CX, 0005H     ; CX = Number of elements
  MOV AX, 0000H     ; AX = Accumulator Sum

SUM_LOOP:
  ADD AX, [SI]      ; AX += NUMBERS[SI]
  ADD SI, 0002H     ; Next element
  DEC CX            ; CX--
  JNZ SUM_LOOP      ; Loop until CX == 0

  MOV BX, AX        ; Copy Sum to BX
  MOV CX, 0005H     ; Divisor = 5
  MOV DX, 0000H     ; Clear high dividend
  DIV CX            ; AX = Sum / 5 (Average), DX = Remainder

  HLT
`,
  },
  {
    id: 'bubble_sort',
    name: '3. Bubble Sort (Ascending)',
    description: 'Sorts an array of 5 words in ascending numerical order using register indirect addressing.',
    code: `; ==========================================
; Program: Bubble Sort on Word Array
; ==========================================
.CODE
  MOV [0000H], 0055H
  MOV [0002H], 0012H
  MOV [0004H], 0088H
  MOV [0006H], 0004H
  MOV [0008H], 0033H

  MOV CX, 0004H     ; Outer loop counter (N-1)

OUTER_LOOP:
  MOV SI, 0000H     ; Inner index pointer
  MOV DX, CX        ; Inner counter

INNER_LOOP:
  MOV AX, [SI]      ; Load item A
  MOV BX, [SI+2]    ; Load item B
  CMP AX, BX        ; Compare A and B
  JBE NO_SWAP       ; If A <= B, no swap needed

  ; Swap elements in memory
  MOV [SI], BX
  MOV [SI+2], AX

NO_SWAP:
  ADD SI, 0002H     ; Advance to next pair
  DEC DX
  JNZ INNER_LOOP

  LOOP OUTER_LOOP

  HLT
`,
  },
  {
    id: 'string_reverse',
    name: '4. String Copy & Inversion',
    description: 'Uses SI and DI indexed pointers to copy and reverse ASCII characters in memory.',
    code: `; ==========================================
; Program: String Inversion using SI & DI
; ==========================================
.CODE
  ; Setup string "HELLO" in memory
  MOV [0000H], 48H  ; 'H'
  MOV [0001H], 45H  ; 'E'
  MOV [0002H], 4CH  ; 'L'
  MOV [0003H], 4CH  ; 'L'
  MOV [0004H], 4FH  ; 'O'

  MOV SI, 0004H     ; Source end pointer
  MOV DI, 0010H     ; Target destination pointer
  MOV CX, 0005H     ; String length = 5

REV_LOOP:
  MOV AL, [SI]      ; Read char from end
  MOV [DI], AL      ; Write char to target
  DEC SI            ; SI--
  INC DI            ; DI++
  LOOP REV_LOOP     ; Loop until finished

  HLT
`,
  },
  {
    id: 'bcd_arithmetic',
    name: '5. Packed BCD Decimal Addition',
    description: 'Performs decimal arithmetic on packed BCD values using DAA instruction.',
    code: `; ==========================================
; Program: Packed BCD Addition with DAA
; Adds 38 (BCD) + 47 (BCD) = 85 (BCD)
; ==========================================
.CODE
  MOV AL, 38H       ; Packed BCD 38
  MOV BL, 47H       ; Packed BCD 47
  ADD AL, BL        ; Binary addition (AL = 7FH)
  DAA               ; Decimal Adjust AL => AL = 85H (BCD)

  MOV [0000H], AL   ; Store BCD result
  HLT
`,
  },
];

/**
 * Parses numeric immediate or address constant (e.g. 1234H, 0x1234, 100, 1010b)
 */
export function parseImmediate8086(token: string): number | null {
  const clean = token.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
  if (/^0x[0-9a-fA-F]+$/i.test(clean)) return parseInt(clean, 16);
  if (/^[0-9a-fA-F]+H$/i.test(clean)) return parseInt(clean.slice(0, -1), 16);
  if (/^[01]+B$/i.test(clean)) return parseInt(clean.slice(0, -1), 2);
  if (/^0b[01]+$/i.test(clean)) return parseInt(clean.slice(2), 2);
  if (/^-?\d+$/.test(clean)) return parseInt(clean, 10);
  return null;
}

export function getInstructionSize8086(mnemonic: string, args: string[]): number {
  const m = mnemonic.toUpperCase();
  const getReg16 = (t: string) => REG16_CODES[t.toUpperCase()];
  const getReg8 = (t: string) => REG8_CODES[t.toUpperCase()];

  // 1-byte
  if (['NOP', 'HLT', 'CBW', 'CWD', 'PUSHF', 'POPF', 'CLC', 'STC', 'CMC', 'CLD', 'STD', 'CLI', 'STI', 'DAA', 'DAS', 'AAA', 'AAS', 'RET', 'RETF', 'IRET', 'MOVSB', 'MOVSW', 'LODSB', 'LODSW', 'STOSB', 'STOSW', 'CMPSB', 'CMPSW', 'SCASB', 'SCASW', 'XLAT', 'LAHF', 'SAHF'].includes(m)) {
    return 1;
  }
  // AAM and AAD encode as 2 bytes (opcode + base byte)
  if (m === 'AAM' || m === 'AAD') return 2;
  if ((m === 'PUSH' || m === 'POP' || m === 'INC' || m === 'DEC') && args[0] && getReg16(args[0]) !== undefined) {
    return 1;
  }
  if (m === 'XCHG' && args.length >= 2) {
    const r1 = getReg16(args[0]);
    const r2 = getReg16(args[1]);
    if (r1 === 0 || r2 === 0) return 1;
  }

  // 2-byte
  if (['INT'].includes(m)) return 2;
  if (['JMP', 'JE', 'JZ', 'JNE', 'JNZ', 'JC', 'JB', 'JNB', 'JNC', 'JAE', 'JA', 'JNBE', 'JBE', 'JNA', 'JG', 'JNLE', 'JGE', 'JNL', 'JL', 'JNGE', 'JLE', 'JNG', 'JS', 'JNS', 'JO', 'JNO', 'JP', 'JPE', 'JNP', 'JPO', 'LOOP', 'LOOPE', 'LOOPNE', 'JCXZ'].includes(m)) {
    return 2;
  }
  if (m === 'MOV' && args.length >= 2) {
    const dstR16 = getReg16(args[0]);
    const srcR16 = getReg16(args[1]);
    const dstR8 = getReg8(args[0]);
    const srcR8 = getReg8(args[1]);
    if (dstR8 !== undefined && parseImmediate8086(args[1]) !== null) return 2;
    if (dstR16 !== undefined && srcR16 === undefined && !args[1].startsWith('[')) return 3;
    if (dstR16 !== undefined && srcR16 !== undefined) return 2;
    if (dstR8 !== undefined && srcR8 !== undefined) return 2;
    if (args[0].startsWith('[') || args[1].startsWith('[')) return 4;
  }
  if (m === 'XCHG') return 2;
  if (['ADD', 'ADC', 'SUB', 'SBB', 'AND', 'OR', 'XOR', 'CMP', 'TEST'].includes(m) && args.length >= 2) {
    const dstR16 = getReg16(args[0]);
    const srcR16 = getReg16(args[1]);
    const dstR8 = getReg8(args[0]);
    const srcR8 = getReg8(args[1]);
    if (dstR16 !== undefined && srcR16 !== undefined) return 2;
    if (dstR8 !== undefined && srcR8 !== undefined) return 2;
    if (dstR16 !== undefined && parseImmediate8086(args[1]) !== null) return 4;
    if (dstR8 !== undefined && parseImmediate8086(args[1]) !== null) return 3;
  }
  if (['INC', 'DEC', 'NEG', 'NOT', 'MUL', 'IMUL', 'DIV', 'IDIV'].includes(m)) return 2;
  if (['SHL', 'SAL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR'].includes(m)) return 2;
  if (m === 'CALL') return 3;
  if (m === 'IN' || m === 'OUT') return 2;

  return 2;
}

/**
 * Encodes ModR/M byte: [mod: 2 bits][reg/opcode: 3 bits][r/m: 3 bits]
 */
export function encodeModRM(mod: number, reg: number, rm: number): number {
  return (((mod & 0x03) << 6) | ((reg & 0x07) << 3) | (rm & 0x07)) & 0xFF;
}

/**
 * Assembles 8086 Assembly Source Code into real machine code bytes
 */
export function assemble8086(sourceCode: string, baseSegment: number = 0x0700): Assembly8086Result & { labels: Record<string, number> } {
  const lines = sourceCode.split('\n');
  const symbolTable: Record<string, number> = {};
  const errors: { line: number; message: string }[] = [];
  const parsedItems: {
    lineNumber: number;
    raw: string;
    label?: string;
    mnemonic?: string;
    args: string[];
    isDirective?: boolean;
    dataBytes?: number[];
  }[] = [];

  let currentOffset = 0x0100;
  const codeSegment = baseSegment;
  const dataSegment = baseSegment;

  // ── PASS 1: Tokenization & Exact Label Discovery ───────────────────────────
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const noComment = lineText.split(';')[0].trim();
    if (!noComment) return;

    let text = noComment;
    let label: string | undefined;

    // Directives
    if (text.toUpperCase().startsWith('.CODE')) {
      parsedItems.push({ lineNumber: lineNum, raw: lineText, isDirective: true, args: [] });
      return;
    }
    if (text.toUpperCase().startsWith('.DATA')) {
      parsedItems.push({ lineNumber: lineNum, raw: lineText, isDirective: true, args: [] });
      return;
    }
    if (text.toUpperCase().startsWith('.MODEL') || text.toUpperCase().startsWith('.STACK')) {
      parsedItems.push({ lineNumber: lineNum, raw: lineText, isDirective: true, args: [] });
      return;
    }

    // Label Match
    const labelMatch = text.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    if (labelMatch) {
      label = labelMatch[1].toUpperCase();
      symbolTable[label] = currentOffset;
      text = text.slice(labelMatch[0].length).trim();
    }

    if (!text) {
      parsedItems.push({ lineNumber: lineNum, raw: lineText, label, args: [] });
      return;
    }

    // Data definitions: e.g. "VAR DB 10, 20" or "NUMBERS DW 10H, 20H"
    const dataDefMatch = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(DB|DW)\s+(.+)$/i);
    if (dataDefMatch) {
      const varName = dataDefMatch[1].toUpperCase();
      const isWord = dataDefMatch[2].toUpperCase() === 'DW';
      const valuesStr = dataDefMatch[3];
      symbolTable[varName] = currentOffset;

      const dataBytes: number[] = [];
      const parts = valuesStr.split(',').map(s => s.trim());
      for (const part of parts) {
        const dupMatch = part.match(/^(\d+)\s+DUP\((.+)\)$/i);
        if (dupMatch) {
          const count = parseInt(dupMatch[1], 10);
          const val = parseImmediate8086(dupMatch[2]) ?? 0;
          for (let c = 0; c < count; c++) {
            if (isWord) {
              dataBytes.push(val & 0xFF, (val >> 8) & 0xFF);
            } else {
              dataBytes.push(val & 0xFF);
            }
          }
        } else {
          const val = parseImmediate8086(part) ?? 0;
          if (isWord) {
            dataBytes.push(val & 0xFF, (val >> 8) & 0xFF);
          } else {
            dataBytes.push(val & 0xFF);
          }
        }
      }

      parsedItems.push({
        lineNumber: lineNum,
        raw: lineText,
        label: varName,
        isDirective: true,
        args: [],
        dataBytes,
      });
      currentOffset += dataBytes.length;
      return;
    }

    // Split mnemonic and args
    const spaceIdx = text.indexOf(' ');
    let mnemonic = '';
    let argsStr = '';
    if (spaceIdx === -1) {
      mnemonic = text.toUpperCase();
    } else {
      mnemonic = text.slice(0, spaceIdx).trim().toUpperCase();
      argsStr = text.slice(spaceIdx).trim();
    }

    const rawArgs = argsStr.length > 0
      ? argsStr.split(',').map(a => a.trim())
      : [];

    parsedItems.push({
      lineNumber: lineNum,
      raw: lineText,
      label,
      mnemonic,
      args: rawArgs,
    });

    // Compute exact instruction byte size in Pass 1
    const size = getInstructionSize8086(mnemonic, rawArgs);
    currentOffset += size;
  });

  // ── PASS 2: Instruction Encoding ──────────────────────────────────────────
  const listing: Assembled8086Line[] = [];
  const machineCode: number[] = [];
  let codeOffset = 0x0100;

  for (const item of parsedItems) {
    const physical = ((codeSegment << 4) + codeOffset) & 0xFFFFF;

    if (item.isDirective) {
      const bytes = item.dataBytes || [];
      for (const b of bytes) machineCode.push(b);
      listing.push({
        address: codeOffset,
        segment: codeSegment,
        physicalAddress: physical,
        sourceLine: item.raw,
        lineNumber: item.lineNumber,
        machineBytes: bytes,
        hex: bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
        isLabelOnly: false,
        label: item.label,
      });
      codeOffset += bytes.length;
      continue;
    }

    if (!item.mnemonic) {
      listing.push({
        address: codeOffset,
        segment: codeSegment,
        physicalAddress: physical,
        sourceLine: item.raw,
        lineNumber: item.lineNumber,
        machineBytes: [],
        hex: '',
        isLabelOnly: true,
        label: item.label,
      });
      continue;
    }

    const m = item.mnemonic;
    const args = item.args;
    const bytes: number[] = [];

    // Helper: parses register or memory or immediate
    const getReg16 = (t: string) => REG16_CODES[t.toUpperCase()];
    const getReg8 = (t: string) => REG8_CODES[t.toUpperCase()];
    const getSeg = (t: string) => SEG_CODES[t.toUpperCase()];

    // ── Single-byte instructions ───────────────────────────────────────────
    if (m === 'NOP') {
      bytes.push(0x90);
    } else if (m === 'HLT') {
      bytes.push(0xF4);
    } else if (m === 'CBW') {
      bytes.push(0x98);
    } else if (m === 'CWD') {
      bytes.push(0x99);
    } else if (m === 'PUSHF') {
      bytes.push(0x9C);
    } else if (m === 'POPF') {
      bytes.push(0x9D);
    } else if (m === 'CLC') {
      bytes.push(0xF8);
    } else if (m === 'STC') {
      bytes.push(0xF9);
    } else if (m === 'CMC') {
      bytes.push(0xF5);
    } else if (m === 'CLD') {
      bytes.push(0xFC);
    } else if (m === 'STD') {
      bytes.push(0xFD);
    } else if (m === 'CLI') {
      bytes.push(0xFA);
    } else if (m === 'STI') {
      bytes.push(0xFB);
    } else if (m === 'DAA') {
      bytes.push(0x27);
    } else if (m === 'DAS') {
      bytes.push(0x2F);
    } else if (m === 'AAA') {
      bytes.push(0x37);
    } else if (m === 'AAS') {
      bytes.push(0x3F);
    } else if (m === 'RET') {
      bytes.push(0xC3);
    } else if (m === 'RETF') {
      bytes.push(0xCB);
    } else if (m === 'IRET') {
      bytes.push(0xCF);
    } else if (m === 'MOVSB') {
      bytes.push(0xA4);
    } else if (m === 'MOVSW') {
      bytes.push(0xA5);
    } else if (m === 'LODSB') {
      bytes.push(0xAC);
    } else if (m === 'LODSW') {
      bytes.push(0xAD);
    } else if (m === 'STOSB') {
      bytes.push(0xAA);
    } else if (m === 'STOSW') {
      bytes.push(0xAB);
    } else if (m === 'CMPSB') {
      bytes.push(0xA6);
    } else if (m === 'CMPSW') {
      bytes.push(0xA7);
    } else if (m === 'SCASB') {
      bytes.push(0xAE);
    } else if (m === 'SCASW') {
      bytes.push(0xAF);
    } else if (m === 'XLAT') {
      bytes.push(0xD7);
    } else if (m === 'LAHF') {
      bytes.push(0x9F);
    } else if (m === 'SAHF') {
      bytes.push(0x9E);
    } else if (m === 'AAM') {
      bytes.push(0xD4, 0x0A); // AAM (base 10)
    } else if (m === 'AAD') {
      bytes.push(0xD5, 0x0A); // AAD (base 10)
    }
    // ── PUSH & POP ─────────────────────────────────────────────────────────
    else if (m === 'PUSH' && args[0]) {
      const r16 = getReg16(args[0]);
      const sReg = getSeg(args[0]);
      if (r16 !== undefined) {
        bytes.push(0x50 + r16);
      } else if (sReg !== undefined) {
        bytes.push(0x06 | (sReg << 3));
      } else {
        bytes.push(0x50); // fallback
      }
    } else if (m === 'POP' && args[0]) {
      const r16 = getReg16(args[0]);
      const sReg = getSeg(args[0]);
      if (r16 !== undefined) {
        bytes.push(0x58 + r16);
      } else if (sReg !== undefined) {
        bytes.push(0x07 | (sReg << 3));
      } else {
        bytes.push(0x58);
      }
    }
    // ── INT ────────────────────────────────────────────────────────────────
    else if (m === 'INT' && args[0]) {
      const intNum = parseImmediate8086(args[0]) ?? 0x21;
      bytes.push(0xCD, intNum & 0xFF);
    }
    // ── MOV Instructions ───────────────────────────────────────────────────
    else if (m === 'MOV') {
      if (args.length < 2) {
        errors.push({ line: item.lineNumber, message: 'MOV requires two operands (destination, source).' });
        bytes.push(0x90);
      } else {
        const dst = args[0];
        const src = args[1];
        const dstR16 = getReg16(dst);
        const srcR16 = getReg16(src);
        const dstR8 = getReg8(dst);
        const srcR8 = getReg8(src);

        // MOV reg16, imm16
        if (dstR16 !== undefined && srcR16 === undefined && !src.startsWith('[')) {
          let imm = parseImmediate8086(src);
          if (imm === null && symbolTable[src.toUpperCase()] !== undefined) {
            imm = symbolTable[src.toUpperCase()];
          }
          const val = imm ?? 0;
          bytes.push(0xB8 + dstR16, val & 0xFF, (val >> 8) & 0xFF);
        }
        // MOV reg8, imm8
        else if (dstR8 !== undefined && srcR8 === undefined && !src.startsWith('[')) {
          const val = parseImmediate8086(src) ?? 0;
          bytes.push(0xB0 + dstR8, val & 0xFF);
        }
        // MOV reg16, reg16
        else if (dstR16 !== undefined && srcR16 !== undefined) {
          bytes.push(0x89, encodeModRM(3, srcR16, dstR16));
        }
        // MOV reg8, reg8
        else if (dstR8 !== undefined && srcR8 !== undefined) {
          bytes.push(0x88, encodeModRM(3, srcR8, dstR8));
        }
        // MOV reg, [mem] or MOV [mem], reg
        else if (dst.startsWith('[')) {
          // Store to memory
          const isWord = srcR16 !== undefined;
          const regCode = isWord ? srcR16 : (srcR8 ?? 0);
          const memAddr = parseImmediate8086(dst) ?? 0;
          bytes.push(isWord ? 0x89 : 0x88, encodeModRM(0, regCode, 6), memAddr & 0xFF, (memAddr >> 8) & 0xFF);
        } else if (src.startsWith('[')) {
          // Load from memory
          const isWord = dstR16 !== undefined;
          const regCode = isWord ? dstR16 : (dstR8 ?? 0);
          const memAddr = parseImmediate8086(src) ?? 0;
          bytes.push(isWord ? 0x8B : 0x8A, encodeModRM(0, regCode, 6), memAddr & 0xFF, (memAddr >> 8) & 0xFF);
        } else {
          // Default fallback
          bytes.push(0x89, 0xC0);
        }
      }
    }
    // ── XCHG Instructions ──────────────────────────────────────────────────
    else if (m === 'XCHG') {
      if (args.length < 2) {
        errors.push({ line: item.lineNumber, message: 'XCHG requires two operands.' });
        bytes.push(0x90);
      } else {
        const dst = args[0];
        const src = args[1];
        const dstR16 = getReg16(dst);
        const srcR16 = getReg16(src);
        const dstR8 = getReg8(dst);
        const srcR8 = getReg8(src);

        if (dstR16 === 0 && srcR16 !== undefined) {
          bytes.push(0x90 + srcR16);
        } else if (srcR16 === 0 && dstR16 !== undefined) {
          bytes.push(0x90 + dstR16);
        } else if (dstR16 !== undefined && srcR16 !== undefined) {
          bytes.push(0x87, encodeModRM(3, srcR16, dstR16));
        } else if (dstR8 !== undefined && srcR8 !== undefined) {
          bytes.push(0x86, encodeModRM(3, srcR8, dstR8));
        } else {
          bytes.push(0x87, 0xC0);
        }
      }
    }
    // ── Arithmetic & Logic (ADD, SUB, AND, OR, XOR, CMP) ───────────────────
    else if (['ADD', 'ADC', 'SUB', 'SBB', 'AND', 'OR', 'XOR', 'CMP', 'TEST'].includes(m)) {
      if (args.length < 2) {
        errors.push({ line: item.lineNumber, message: `${m} requires two operands.` });
        bytes.push(0x90);
      } else {
        const opcodes: Record<string, { r16: number; r8: number; imm16: number; imm8: number; regOp: number }> = {
          ADD:  { r16: 0x01, r8: 0x00, imm16: 0x81, imm8: 0x80, regOp: 0 },
          OR:   { r16: 0x09, r8: 0x08, imm16: 0x81, imm8: 0x80, regOp: 1 },
          ADC:  { r16: 0x11, r8: 0x10, imm16: 0x81, imm8: 0x80, regOp: 2 },
          SBB:  { r16: 0x19, r8: 0x18, imm16: 0x81, imm8: 0x80, regOp: 3 },
          AND:  { r16: 0x21, r8: 0x20, imm16: 0x81, imm8: 0x80, regOp: 4 },
          SUB:  { r16: 0x29, r8: 0x28, imm16: 0x81, imm8: 0x80, regOp: 5 },
          XOR:  { r16: 0x31, r8: 0x30, imm16: 0x81, imm8: 0x80, regOp: 6 },
          CMP:  { r16: 0x39, r8: 0x38, imm16: 0x81, imm8: 0x80, regOp: 7 },
          TEST: { r16: 0x85, r8: 0x84, imm16: 0xF7, imm8: 0xF6, regOp: 0 },
        };

        const info = opcodes[m];
        const dst = args[0];
        const src = args[1];
        const dstR16 = getReg16(dst);
        const srcR16 = getReg16(src);
        const dstR8 = getReg8(dst);
        const srcR8 = getReg8(src);

        if (dstR16 !== undefined && srcR16 !== undefined) {
          bytes.push(info.r16, encodeModRM(3, srcR16, dstR16));
        } else if (dstR8 !== undefined && srcR8 !== undefined) {
          bytes.push(info.r8, encodeModRM(3, srcR8, dstR8));
        } else if (dstR16 !== undefined && parseImmediate8086(src) !== null) {
          const imm = parseImmediate8086(src) ?? 0;
          bytes.push(info.imm16, encodeModRM(3, info.regOp, dstR16), imm & 0xFF, (imm >> 8) & 0xFF);
        } else if (dstR8 !== undefined && parseImmediate8086(src) !== null) {
          const imm = parseImmediate8086(src) ?? 0;
          bytes.push(info.imm8, encodeModRM(3, info.regOp, dstR8), imm & 0xFF);
        } else {
          bytes.push(info.r16, 0xC0);
        }
      }
    }
    // ── Unary Operations (INC, DEC, NEG, NOT, MUL, DIV) ────────────────────
    else if (['INC', 'DEC', 'NEG', 'NOT', 'MUL', 'IMUL', 'DIV', 'IDIV'].includes(m) && args[0]) {
      const dst = args[0];
      const r16 = getReg16(dst);
      const r8 = getReg8(dst);

      if (m === 'INC' && r16 !== undefined) {
        bytes.push(0x40 + r16);
      } else if (m === 'DEC' && r16 !== undefined) {
        bytes.push(0x48 + r16);
      } else {
        const regOpMap: Record<string, number> = {
          NOT: 2, NEG: 3, MUL: 4, IMUL: 5, DIV: 6, IDIV: 7, INC: 0, DEC: 1,
        };
        const regOp = regOpMap[m] ?? 0;
        if (r16 !== undefined) {
          bytes.push(0xF7, encodeModRM(3, regOp, r16));
        } else if (r8 !== undefined) {
          bytes.push(0xF6, encodeModRM(3, regOp, r8));
        } else {
          bytes.push(0xF7, encodeModRM(3, regOp, 0));
        }
      }
    }
    // ── Shifts & Rotates (SHL, SHR, SAR, ROL, ROR, RCL, RCR) ───────────────
    else if (['SHL', 'SAL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR'].includes(m) && args[0]) {
      const regOpMap: Record<string, number> = {
        ROL: 0, ROR: 1, RCL: 2, RCR: 3, SHL: 4, SAL: 4, SHR: 5, SAR: 7,
      };
      const dst = args[0];
      const r16 = getReg16(dst);
      const r8 = getReg8(dst);
      const countToken = (args[1] || '1').toUpperCase();
      const isCL = countToken === 'CL';
      const regOp = regOpMap[m] ?? 4;

      const baseOp = isCL ? (r16 !== undefined ? 0xD3 : 0xD2) : (r16 !== undefined ? 0xD1 : 0xD0);
      const regCode = r16 !== undefined ? r16 : (r8 ?? 0);
      bytes.push(baseOp, encodeModRM(3, regOp, regCode));
    }
    // ── Jump and Call Instructions ─────────────────────────────────────────
    else if (['JMP', 'JE', 'JZ', 'JNE', 'JNZ', 'JC', 'JB', 'JNB', 'JNC', 'JAE', 'JA', 'JNBE', 'JBE', 'JNA', 'JG', 'JNLE', 'JGE', 'JNL', 'JL', 'JNGE', 'JLE', 'JNG', 'JS', 'JNS', 'JO', 'JNO', 'JP', 'JPE', 'JNP', 'JPO', 'LOOP', 'LOOPE', 'LOOPNE', 'JCXZ', 'CALL'].includes(m)) {
      const jumpOpMap: Record<string, number> = {
        JO:   0x70, JNO:  0x71,
        JB:   0x72, JC:   0x72, JNAE: 0x72,
        JNB:  0x73, JNC:  0x73, JAE:  0x73,
        JE:   0x74, JZ:   0x74,
        JNE:  0x75, JNZ:  0x75,
        JBE:  0x76, JNA:  0x76,
        JA:   0x77, JNBE: 0x77,
        JS:   0x78, JNS:  0x79,
        JP:   0x7A, JPE:  0x7A,
        JNP:  0x7B, JPO:  0x7B,
        JL:   0x7C, JNGE: 0x7C,
        JGE:  0x7D, JNL:  0x7D,
        JLE:  0x7E, JNG:  0x7E,
        JG:   0x7F, JNLE: 0x7F,
        LOOPNE: 0xE0, LOOPE: 0xE1, LOOP: 0xE2, JCXZ: 0xE3, JMP: 0xEB, CALL: 0xE8,
      };

      const targetLabel = args[0]?.toUpperCase();
      let targetAddr = symbolTable[targetLabel];
      if (targetAddr === undefined) {
        const imm = parseImmediate8086(args[0] ?? '');
        if (imm !== null) {
          targetAddr = imm;
        } else {
          errors.push({ line: item.lineNumber, message: `Undefined label: "${targetLabel}"` });
          targetAddr = codeOffset;
        }
      }

      const opByte = jumpOpMap[m] ?? 0xEB;
      if (m === 'CALL') {
        const rel16 = (targetAddr - (codeOffset + 3)) & 0xFFFF;
        bytes.push(0xE8, rel16 & 0xFF, (rel16 >> 8) & 0xFF);
      } else {
        const rel8 = (targetAddr - (codeOffset + 2)) & 0xFF;
        bytes.push(opByte, rel8);
      }
    }
    // ── I/O Port Instructions (IN, OUT) ────────────────────────────────────
    else if (m === 'IN' && args.length >= 2) {
      const isWord = args[0].toUpperCase() === 'AX';
      const port = parseImmediate8086(args[1]);
      if (port !== null) {
        bytes.push(isWord ? 0xE5 : 0xE4, port & 0xFF);
      } else {
        // IN AX, DX
        bytes.push(isWord ? 0xED : 0xEC);
      }
    } else if (m === 'OUT' && args.length >= 2) {
      const isWord = args[1].toUpperCase() === 'AX';
      const port = parseImmediate8086(args[0]);
      if (port !== null) {
        bytes.push(isWord ? 0xE7 : 0xE6, port & 0xFF);
      } else {
        // OUT DX, AX
        bytes.push(isWord ? 0xEF : 0xEE);
      }
    }
    // ── Unknown Mnemonic Fallback ──────────────────────────────────────────
    else {
      errors.push({ line: item.lineNumber, message: `Unknown instruction or invalid syntax: "${m}"` });
      bytes.push(0x90); // default NOP
    }

    for (const b of bytes) machineCode.push(b);

    listing.push({
      address: codeOffset,
      segment: codeSegment,
      physicalAddress: physical,
      sourceLine: item.raw,
      lineNumber: item.lineNumber,
      machineBytes: bytes,
      hex: bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
      isLabelOnly: false,
      label: item.label,
    });

    codeOffset += bytes.length;
  }

  return {
    success: errors.length === 0,
    listing,
    machineCode,
    symbolTable,
    labels: symbolTable,
    codeSegment,
    dataSegment,
    startOffset: 0x0100,
    errors,
  };
}

/**
 * Disassembles 8086 machine code bytes into readable assembly lines
 */
export function disassemble8086Bytes(bytes: number[], startOffset: number = 0x0100): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < bytes.length) {
    const addr = startOffset + i;
    const b0 = bytes[i];
    let inst = '';
    let len = 1;

    // Single-byte opcodes
    if (b0 === 0x90) inst = 'NOP';
    else if (b0 === 0xF4) inst = 'HLT';
    else if (b0 === 0x98) inst = 'CBW';
    else if (b0 === 0x99) inst = 'CWD';
    else if (b0 === 0x9C) inst = 'PUSHF';
    else if (b0 === 0x9D) inst = 'POPF';
    else if (b0 === 0xF8) inst = 'CLC';
    else if (b0 === 0xF9) inst = 'STC';
    else if (b0 === 0xF5) inst = 'CMC';
    else if (b0 === 0xFC) inst = 'CLD';
    else if (b0 === 0xFD) inst = 'STD';
    else if (b0 === 0xFA) inst = 'CLI';
    else if (b0 === 0xFB) inst = 'STI';
    else if (b0 === 0x27) inst = 'DAA';
    else if (b0 === 0x2F) inst = 'DAS';
    else if (b0 === 0x37) inst = 'AAA';
    else if (b0 === 0x3F) inst = 'AAS';
    else if (b0 === 0xC3) inst = 'RET';
    else if (b0 === 0xCB) inst = 'RETF';
    else if (b0 === 0xCF) inst = 'IRET';
    else if (b0 === 0xA4) inst = 'MOVSB';
    else if (b0 === 0xA5) inst = 'MOVSW';
    else if (b0 === 0xAC) inst = 'LODSB';
    else if (b0 === 0xAD) inst = 'LODSW';
    else if (b0 === 0xAA) inst = 'STOSB';
    else if (b0 === 0xAB) inst = 'STOSW';
    // PUSH & POP reg16
    else if (b0 >= 0x50 && b0 <= 0x57) {
      const regName = ['AX', 'CX', 'DX', 'BX', 'SP', 'BP', 'SI', 'DI'][b0 - 0x50];
      inst = `PUSH ${regName}`;
    } else if (b0 >= 0x58 && b0 <= 0x5F) {
      const regName = ['AX', 'CX', 'DX', 'BX', 'SP', 'BP', 'SI', 'DI'][b0 - 0x58];
      inst = `POP ${regName}`;
    }
    // MOV reg16, imm16
    else if (b0 >= 0xB8 && b0 <= 0xBF && i + 2 < bytes.length) {
      const regName = ['AX', 'CX', 'DX', 'BX', 'SP', 'BP', 'SI', 'DI'][b0 - 0xB8];
      const imm16 = bytes[i + 1] | (bytes[i + 2] << 8);
      inst = `MOV ${regName}, ${imm16.toString(16).toUpperCase().padStart(4, '0')}H`;
      len = 3;
    }
    // MOV reg8, imm8
    else if (b0 >= 0xB0 && b0 <= 0xB7 && i + 1 < bytes.length) {
      const regName = ['AL', 'CL', 'DL', 'BL', 'AH', 'CH', 'DH', 'BH'][b0 - 0xB0];
      inst = `MOV ${regName}, ${bytes[i + 1].toString(16).toUpperCase().padStart(2, '0')}H`;
      len = 2;
    }
    // INT imm8
    else if (b0 === 0xCD && i + 1 < bytes.length) {
      inst = `INT ${bytes[i + 1].toString(16).toUpperCase()}H`;
      len = 2;
    }
    // Jumps
    else if (b0 === 0xEB && i + 1 < bytes.length) {
      const rel8 = (bytes[i + 1] << 24) >> 24;
      const target = addr + 2 + rel8;
      inst = `JMP ${target.toString(16).toUpperCase().padStart(4, '0')}H`;
      len = 2;
    } else if (b0 === 0x74 && i + 1 < bytes.length) {
      const rel8 = (bytes[i + 1] << 24) >> 24;
      const target = addr + 2 + rel8;
      inst = `JE ${target.toString(16).toUpperCase().padStart(4, '0')}H`;
      len = 2;
    } else if (b0 === 0x75 && i + 1 < bytes.length) {
      const rel8 = (bytes[i + 1] << 24) >> 24;
      const target = addr + 2 + rel8;
      inst = `JNE ${target.toString(16).toUpperCase().padStart(4, '0')}H`;
      len = 2;
    } else if (b0 === 0xE2 && i + 1 < bytes.length) {
      const rel8 = (bytes[i + 1] << 24) >> 24;
      const target = addr + 2 + rel8;
      inst = `LOOP ${target.toString(16).toUpperCase().padStart(4, '0')}H`;
      len = 2;
    }
    // Fallback
    else {
      inst = `DB ${b0.toString(16).toUpperCase().padStart(2, '0')}H`;
      len = 1;
    }

    const hexBytes = bytes.slice(i, i + len).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    result.push(`${addr.toString(16).toUpperCase().padStart(4, '0')}  ${hexBytes.padEnd(9, ' ')}  ${inst}`);
    i += len;
  }

  return result;
}

/**
 * Returns formatted disassembly text string for a machine code byte sequence
 */
export function disassemble8086(bytes: number[], startOffset: number = 0x0100): string {
  return disassemble8086Bytes(bytes, startOffset).join('\n');
}


