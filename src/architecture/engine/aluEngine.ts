/**
 * ALU Engine for the Computer Architecture Lab
 * Performs mathematically rigorous arithmetic and logical operations
 * across 4-bit, 8-bit, 16-bit, and 32-bit words with full status flag assertions.
 */

export interface AluResult {
  opcode: number;
  operationName: string;
  bitWidth: number;
  valA: number;
  valB: number;
  result: number;
  resultBits: (0 | 1)[];
  flags: {
    zero: boolean;
    negative: boolean;
    carry: boolean;
    overflow: boolean;
  };
  explanation: string;
}

export const ALU_OPERATIONS = [
  { opcode: 0, mnemonic: 'ADD', name: 'Addition', symbol: 'A + B', description: 'Adds A and B' },
  { opcode: 1, mnemonic: 'SUB', name: 'Subtraction', symbol: 'A - B', description: 'Subtracts B from A (A + NOT(B) + 1)' },
  { opcode: 2, mnemonic: 'AND', name: 'Bitwise AND', symbol: 'A & B', description: 'Bitwise AND between A and B' },
  { opcode: 3, mnemonic: 'OR', name: 'Bitwise OR', symbol: 'A | B', description: 'Bitwise OR between A and B' },
  { opcode: 4, mnemonic: 'XOR', name: 'Bitwise XOR', symbol: 'A ^ B', description: 'Bitwise XOR (Parity/Difference)' },
  { opcode: 5, mnemonic: 'NOT', name: 'Bitwise NOT', symbol: '~A', description: 'Bitwise 1s Complement of A' },
  { opcode: 6, mnemonic: 'SHL', name: 'Shift Left', symbol: 'A << 1', description: 'Logical shift left by 1 bit (Multiply by 2)' },
  { opcode: 7, mnemonic: 'SHR', name: 'Shift Right', symbol: 'A >> 1', description: 'Logical shift right by 1 bit (Divide by 2)' },
];

export function computeALU(
  opcode: number,
  valA: number,
  valB: number,
  bitWidth: number = 8
): AluResult {
  const mask = bitWidth === 32 ? 0xFFFFFFFF : (1 << bitWidth) - 1;
  const aClamped = (valA >>> 0) & mask;
  const bClamped = (valB >>> 0) & mask;

  let rawResult = 0;
  let carry = false;
  let overflow = false;

  switch (opcode) {
    case 0: { // ADD
      const sum = aClamped + bClamped;
      rawResult = sum;
      carry = sum > mask;

      // Signed overflow check
      const signA = (aClamped >> (bitWidth - 1)) & 1;
      const signB = (bClamped >> (bitWidth - 1)) & 1;
      const signR = ((rawResult & mask) >> (bitWidth - 1)) & 1;
      overflow = signA === signB && signA !== signR;
      break;
    }
    case 1: { // SUB
      const diff = aClamped - bClamped;
      rawResult = diff < 0 ? diff + (bitWidth === 32 ? 0x100000000 : (1 << bitWidth)) : diff;
      carry = aClamped < bClamped; // Borrow

      const signA = (aClamped >> (bitWidth - 1)) & 1;
      const signB = (bClamped >> (bitWidth - 1)) & 1;
      const signR = ((rawResult & mask) >> (bitWidth - 1)) & 1;
      overflow = signA !== signB && signA !== signR;
      break;
    }
    case 2: { // AND
      rawResult = aClamped & bClamped;
      break;
    }
    case 3: { // OR
      rawResult = aClamped | bClamped;
      break;
    }
    case 4: { // XOR
      rawResult = aClamped ^ bClamped;
      break;
    }
    case 5: { // NOT
      rawResult = ~aClamped;
      break;
    }
    case 6: { // SHL
      rawResult = aClamped << 1;
      carry = ((aClamped >> (bitWidth - 1)) & 1) === 1;
      break;
    }
    case 7: { // SHR
      rawResult = aClamped >>> 1;
      carry = (aClamped & 1) === 1;
      break;
    }
    default:
      rawResult = 0;
  }

  const result = (rawResult >>> 0) & mask;
  const resultBits: (0 | 1)[] = [];
  for (let i = 0; i < bitWidth; i++) {
    resultBits.push(((result >>> i) & 1) as 0 | 1);
  }

  const zero = result === 0;
  const negative = ((result >> (bitWidth - 1)) & 1) === 1;

  const opDef = ALU_OPERATIONS.find(op => op.opcode === opcode) || ALU_OPERATIONS[0];
  const explanation = `${opDef.name} (${opDef.symbol}): A=0x${aClamped.toString(16).toUpperCase()} (${aClamped}), B=0x${bClamped.toString(16).toUpperCase()} (${bClamped}) => Result = 0x${result.toString(16).toUpperCase()} (${result}). Flags: Z=${zero ? 1 : 0}, N=${negative ? 1 : 0}, C=${carry ? 1 : 0}, V=${overflow ? 1 : 0}.`;

  return {
    opcode,
    operationName: opDef.mnemonic,
    bitWidth,
    valA: aClamped,
    valB: bClamped,
    result,
    resultBits,
    flags: {
      zero,
      negative,
      carry,
      overflow,
    },
    explanation,
  };
}
