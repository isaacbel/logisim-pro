/**
 * Intel 8086 Arithmetic & Logic Unit (ALU) Engine
 * Implements mathematically exact 8-bit and 16-bit arithmetic, logic,
 * shift, rotate, and BCD operations with full hardware FLAGS updates.
 */

import { Flags8086 } from './cpu8086Types';

export type Alu8086Op =
  | 'ADD'
  | 'ADC'
  | 'SUB'
  | 'SBB'
  | 'INC'
  | 'DEC'
  | 'NEG'
  | 'CMP'
  | 'MUL'
  | 'IMUL'
  | 'DIV'
  | 'IDIV'
  | 'DAA'
  | 'DAS'
  | 'AAA'
  | 'AAS'
  | 'AAM'
  | 'AAD'
  | 'CBW'
  | 'CWD'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'NOT'
  | 'TEST'
  | 'SHL'
  | 'SAL'
  | 'SHR'
  | 'SAR'
  | 'ROL'
  | 'ROR'
  | 'RCL'
  | 'RCR';

export interface Alu8086Result {
  op: Alu8086Op;
  is16Bit: boolean;
  operandA: number;
  operandB: number;
  result: number;       // 8-bit or 16-bit main result
  resultHigh?: number;   // DX / AH in case of multiplication/division
  flags: Flags8086;
  flagsChanged: {
    cf: boolean;
    pf: boolean;
    af: boolean;
    zf: boolean;
    sf: boolean;
    of: boolean;
  };
  explanation: string;
}

/**
 * Returns clean initial 8086 FLAGS structure
 */
export function initial8086Flags(): Flags8086 {
  return {
    cf: false,
    pf: false,
    af: false,
    zf: false,
    sf: false,
    tf: false,
    if: true,
    df: false,
    of: false,
  };
}

/**
 * Computes Parity Flag: true if lowest 8 bits contain an even number of set bits (1s)
 */
export function calculateParity8(val: number): boolean {
  let v = val & 0xFF;
  v ^= v >> 4;
  v ^= v >> 2;
  v ^= v >> 1;
  return (v & 1) === 0;
}

/**
 * Executes an 8086 ALU operation with full flag semantics
 */
export function executeAlu8086(
  op: Alu8086Op,
  operandA: number,
  operandB: number,
  is16Bit: boolean,
  currentFlags: Flags8086
): Alu8086Result {
  const mask = is16Bit ? 0xFFFF : 0xFF;
  const msbMask = is16Bit ? 0x8000 : 0x80;
  const signBit = is16Bit ? 15 : 7;
  const a = operandA & mask;
  const b = operandB & mask;

  let result = 0;
  let resultHigh: number | undefined = undefined;
  const nextFlags: Flags8086 = { ...currentFlags };
  const changed = { cf: false, pf: false, af: false, zf: false, sf: false, of: false };
  let explanation = '';

  const updateLogicFlags = (res: number) => {
    nextFlags.cf = false;
    nextFlags.of = false;
    nextFlags.zf = (res & mask) === 0;
    nextFlags.sf = ((res & msbMask) !== 0);
    nextFlags.pf = calculateParity8(res);
    // AF is undefined in 8086 for logic operations, leave unchanged or false
    changed.cf = true;
    changed.of = true;
    changed.zf = true;
    changed.sf = true;
    changed.pf = true;
  };

  switch (op) {
    case 'ADD':
    case 'ADC': {
      const carryIn = (op === 'ADC' && currentFlags.cf) ? 1 : 0;
      const raw = a + b + carryIn;
      result = raw & mask;

      nextFlags.cf = raw > mask;
      nextFlags.af = ((a & 0x0F) + (b & 0x0F) + carryIn) > 0x0F;
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & msbMask) !== 0;
      nextFlags.pf = calculateParity8(result);

      // Overflow: (A_msb == B_msb) and (Result_msb != A_msb)
      const aSign = (a >> signBit) & 1;
      const bSign = (b >> signBit) & 1;
      const rSign = (result >> signBit) & 1;
      nextFlags.of = (aSign === bSign) && (rSign !== aSign);

      changed.cf = true;
      changed.af = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      changed.of = true;

      explanation = `${op} (${is16Bit ? '16-bit' : '8-bit'}): 0x${a.toString(16).toUpperCase()} + 0x${b.toString(16).toUpperCase()}${carryIn ? ' + CF(1)' : ''} = 0x${result.toString(16).toUpperCase()}. Flags: CF=${nextFlags.cf ? 1 : 0}, ZF=${nextFlags.zf ? 1 : 0}, SF=${nextFlags.sf ? 1 : 0}, OF=${nextFlags.of ? 1 : 0}, AF=${nextFlags.af ? 1 : 0}, PF=${nextFlags.pf ? 1 : 0}.`;
      break;
    }

    case 'SUB':
    case 'SBB':
    case 'CMP': {
      const borrowIn = (op === 'SBB' && currentFlags.cf) ? 1 : 0;
      const raw = a - b - borrowIn;
      result = (raw + (mask + 1)) & mask;

      nextFlags.cf = a < (b + borrowIn);
      nextFlags.af = (a & 0x0F) < ((b & 0x0F) + borrowIn);
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & msbMask) !== 0;
      nextFlags.pf = calculateParity8(result);

      // Overflow for subtraction: (A_msb != B_msb) and (Result_msb != A_msb)
      const aSign = (a >> signBit) & 1;
      const bSign = (b >> signBit) & 1;
      const rSign = (result >> signBit) & 1;
      nextFlags.of = (aSign !== bSign) && (rSign !== aSign);

      changed.cf = true;
      changed.af = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      changed.of = true;

      if (op === 'CMP') {
        explanation = `CMP (${is16Bit ? '16-bit' : '8-bit'}): Compare 0x${a.toString(16).toUpperCase()} with 0x${b.toString(16).toUpperCase()}. Sets flags without storing result. ${a === b ? 'Values Equal (ZF=1)' : a > b ? 'A > B (CF=0, ZF=0)' : 'A < B (CF=1, ZF=0)'}.`;
      } else {
        explanation = `${op} (${is16Bit ? '16-bit' : '8-bit'}): 0x${a.toString(16).toUpperCase()} - 0x${b.toString(16).toUpperCase()}${borrowIn ? ' - CF(1)' : ''} = 0x${result.toString(16).toUpperCase()}. Flags: CF=${nextFlags.cf ? 1 : 0}, ZF=${nextFlags.zf ? 1 : 0}, SF=${nextFlags.sf ? 1 : 0}, OF=${nextFlags.of ? 1 : 0}.`;
      }
      break;
    }

    case 'INC': {
      const raw = a + 1;
      result = raw & mask;

      // INC affects AF, OF, PF, SF, ZF but NOT CF
      nextFlags.af = ((a & 0x0F) + 1) > 0x0F;
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & msbMask) !== 0;
      nextFlags.pf = calculateParity8(result);
      nextFlags.of = a === (is16Bit ? 0x7FFF : 0x7F);

      changed.af = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      changed.of = true;

      explanation = `INC (${is16Bit ? '16-bit' : '8-bit'}): 0x${a.toString(16).toUpperCase()} + 1 = 0x${result.toString(16).toUpperCase()} (CF preserved).`;
      break;
    }

    case 'DEC': {
      const raw = a - 1;
      result = (raw + (mask + 1)) & mask;

      // DEC affects AF, OF, PF, SF, ZF but NOT CF
      nextFlags.af = (a & 0x0F) === 0;
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & msbMask) !== 0;
      nextFlags.pf = calculateParity8(result);
      nextFlags.of = a === (is16Bit ? 0x8000 : 0x80);

      changed.af = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      changed.of = true;

      explanation = `DEC (${is16Bit ? '16-bit' : '8-bit'}): 0x${a.toString(16).toUpperCase()} - 1 = 0x${result.toString(16).toUpperCase()} (CF preserved).`;
      break;
    }

    case 'NEG': {
      // 2's complement negation: 0 - A
      result = (0 - a + (mask + 1)) & mask;

      nextFlags.cf = a !== 0; // CF=1 if operand is non-zero
      nextFlags.af = (a & 0x0F) !== 0;
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & msbMask) !== 0;
      nextFlags.pf = calculateParity8(result);
      nextFlags.of = a === (is16Bit ? 0x8000 : 0x80);

      changed.cf = true;
      changed.af = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      changed.of = true;

      explanation = `NEG (${is16Bit ? '16-bit' : '8-bit'}): 2's complement negation of 0x${a.toString(16).toUpperCase()} = 0x${result.toString(16).toUpperCase()}.`;
      break;
    }

    case 'MUL': {
      if (is16Bit) {
        // AX * Operand => DX:AX
        const product = a * b;
        result = product & 0xFFFF;
        resultHigh = (product >>> 16) & 0xFFFF;
        const upperNonZero = resultHigh !== 0;
        nextFlags.cf = upperNonZero;
        nextFlags.of = upperNonZero;
        explanation = `MUL (16-bit): AX(0x${a.toString(16).toUpperCase()}) * 0x${b.toString(16).toUpperCase()} = DX:AX (0x${resultHigh.toString(16).toUpperCase()}:${result.toString(16).toUpperCase()}). CF=OF=${upperNonZero ? 1 : 0}.`;
      } else {
        // AL * Operand => AX
        const product = a * b;
        result = product & 0xFF;
        resultHigh = (product >>> 8) & 0xFF;
        const upperNonZero = resultHigh !== 0;
        nextFlags.cf = upperNonZero;
        nextFlags.of = upperNonZero;
        explanation = `MUL (8-bit): AL(0x${a.toString(16).toUpperCase()}) * 0x${b.toString(16).toUpperCase()} = AX(0x${product.toString(16).toUpperCase()}). CF=OF=${upperNonZero ? 1 : 0}.`;
      }
      changed.cf = true;
      changed.of = true;
      break;
    }

    case 'IMUL': {
      // Signed multiplication
      const toSigned = (val: number, bits: number) => {
        return val >= (1 << (bits - 1)) ? val - (1 << bits) : val;
      };
      if (is16Bit) {
        const sA = toSigned(a, 16);
        const sB = toSigned(b, 16);
        const product = sA * sB;
        const uProduct = (product < 0 ? product + 0x100000000 : product) >>> 0;
        result = uProduct & 0xFFFF;
        resultHigh = (uProduct >>> 16) & 0xFFFF;
        const signExtended = (product >= -32768 && product <= 32767);
        nextFlags.cf = !signExtended;
        nextFlags.of = !signExtended;
        explanation = `IMUL (16-bit signed): ${sA} * ${sB} = ${product} => DX:AX = 0x${resultHigh.toString(16).toUpperCase()}:${result.toString(16).toUpperCase()}.`;
      } else {
        const sA = toSigned(a, 8);
        const sB = toSigned(b, 8);
        const product = sA * sB;
        const uProduct = (product < 0 ? product + 0x10000 : product) & 0xFFFF;
        result = uProduct & 0xFF;
        resultHigh = (uProduct >>> 8) & 0xFF;
        const signExtended = (product >= -128 && product <= 127);
        nextFlags.cf = !signExtended;
        nextFlags.of = !signExtended;
        explanation = `IMUL (8-bit signed): ${sA} * ${sB} = ${product} => AX = 0x${uProduct.toString(16).toUpperCase()}.`;
      }
      changed.cf = true;
      changed.of = true;
      break;
    }

    case 'DIV': {
      if (b === 0) {
        explanation = `DIV: Division by zero exception (INT 0).`;
        result = 0;
        break;
      }
      if (is16Bit) {
        // DX:AX / Operand => AX (Quotient), DX (Remainder)
        const dividend = (operandA & 0xFFFF) | ((operandB & 0xFFFF) << 16); // DX:AX
        const divisor = operandB & 0xFFFF;
        const quot = Math.floor(dividend / divisor);
        const rem = dividend % divisor;
        result = quot & 0xFFFF;
        resultHigh = rem & 0xFFFF;
        explanation = `DIV (16-bit): DX:AX(0x${dividend.toString(16).toUpperCase()}) / 0x${divisor.toString(16).toUpperCase()} => Quotient AX=0x${result.toString(16).toUpperCase()}, Remainder DX=0x${resultHigh.toString(16).toUpperCase()}.`;
      } else {
        // AX / Operand => AL (Quotient), AH (Remainder)
        const dividend = operandA & 0xFFFF;
        const divisor = operandB & 0xFF;
        const quot = Math.floor(dividend / divisor);
        const rem = dividend % divisor;
        result = quot & 0xFF;
        resultHigh = rem & 0xFF;
        explanation = `DIV (8-bit): AX(0x${dividend.toString(16).toUpperCase()}) / 0x${divisor.toString(16).toUpperCase()} => Quotient AL=0x${result.toString(16).toUpperCase()}, Remainder AH=0x${resultHigh.toString(16).toUpperCase()}.`;
      }
      break;
    }

    case 'AND': {
      result = (a & b) & mask;
      updateLogicFlags(result);
      explanation = `AND: 0x${a.toString(16).toUpperCase()} & 0x${b.toString(16).toUpperCase()} = 0x${result.toString(16).toUpperCase()}. CF=0, OF=0.`;
      break;
    }

    case 'OR': {
      result = (a | b) & mask;
      updateLogicFlags(result);
      explanation = `OR: 0x${a.toString(16).toUpperCase()} | 0x${b.toString(16).toUpperCase()} = 0x${result.toString(16).toUpperCase()}. CF=0, OF=0.`;
      break;
    }

    case 'XOR': {
      result = (a ^ b) & mask;
      updateLogicFlags(result);
      explanation = `XOR: 0x${a.toString(16).toUpperCase()} ^ 0x${b.toString(16).toUpperCase()} = 0x${result.toString(16).toUpperCase()}. CF=0, OF=0.`;
      break;
    }

    case 'NOT': {
      result = (~a) & mask;
      // NOT does not alter any flags
      explanation = `NOT: Bitwise complement ~0x${a.toString(16).toUpperCase()} = 0x${result.toString(16).toUpperCase()} (Flags unchanged).`;
      break;
    }

    case 'TEST': {
      const testVal = (a & b) & mask;
      updateLogicFlags(testVal);
      result = a; // operand not altered
      explanation = `TEST: Non-destructive AND between 0x${a.toString(16).toUpperCase()} and 0x${b.toString(16).toUpperCase()}. Flags updated (ZF=${nextFlags.zf ? 1 : 0}, SF=${nextFlags.sf ? 1 : 0}, PF=${nextFlags.pf ? 1 : 0}).`;
      break;
    }

    case 'SHL':
    case 'SAL': {
      const count = b & (is16Bit ? 0x1F : 0x1F); // 8086 count
      if (count === 0) {
        result = a;
        explanation = `${op}: Shift count is 0, flags unchanged.`;
        break;
      }
      let temp = a;
      let lastOutBit = 0;
      for (let i = 0; i < count; i++) {
        lastOutBit = (temp >> signBit) & 1;
        temp = (temp << 1) & mask;
      }
      result = temp;
      nextFlags.cf = lastOutBit === 1;
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & msbMask) !== 0;
      nextFlags.pf = calculateParity8(result);
      if (count === 1) {
        const newMsb = (result >> signBit) & 1;
        nextFlags.of = (newMsb !== lastOutBit);
        changed.of = true;
      }
      changed.cf = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      explanation = `${op}: 0x${a.toString(16).toUpperCase()} << ${count} = 0x${result.toString(16).toUpperCase()}. CF=${nextFlags.cf ? 1 : 0}.`;
      break;
    }

    case 'SHR': {
      const count = b & 0x1F;
      if (count === 0) {
        result = a;
        explanation = `SHR: Shift count is 0, flags unchanged.`;
        break;
      }
      let temp = a;
      let lastOutBit = 0;
      for (let i = 0; i < count; i++) {
        lastOutBit = temp & 1;
        temp = temp >>> 1;
      }
      result = temp & mask;
      nextFlags.cf = lastOutBit === 1;
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & msbMask) !== 0;
      nextFlags.pf = calculateParity8(result);
      if (count === 1) {
        nextFlags.of = (a & msbMask) !== 0; // OF is MSB of original operand
        changed.of = true;
      }
      changed.cf = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      explanation = `SHR: Logical Shift Right 0x${a.toString(16).toUpperCase()} >> ${count} = 0x${result.toString(16).toUpperCase()}. CF=${nextFlags.cf ? 1 : 0}.`;
      break;
    }

    case 'SAR': {
      const count = b & 0x1F;
      if (count === 0) {
        result = a;
        explanation = `SAR: Shift count is 0, flags unchanged.`;
        break;
      }
      let temp = a;
      let lastOutBit = 0;
      const msb = a & msbMask;
      for (let i = 0; i < count; i++) {
        lastOutBit = temp & 1;
        temp = (temp >>> 1) | msb;
      }
      result = temp & mask;
      nextFlags.cf = lastOutBit === 1;
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & msbMask) !== 0;
      nextFlags.pf = calculateParity8(result);
      if (count === 1) {
        nextFlags.of = false; // OF is 0 for 1-bit SAR
        changed.of = true;
      }
      changed.cf = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      explanation = `SAR: Arithmetic Shift Right (sign-preserving) 0x${a.toString(16).toUpperCase()} >> ${count} = 0x${result.toString(16).toUpperCase()}. CF=${nextFlags.cf ? 1 : 0}.`;
      break;
    }

    case 'ROL': {
      const count = b & 0x1F;
      let temp = a;
      for (let i = 0; i < count; i++) {
        const msb = (temp >> signBit) & 1;
        temp = ((temp << 1) & mask) | msb;
        nextFlags.cf = msb === 1;
      }
      result = temp;
      if (count === 1) {
        const newMsb = (result >> signBit) & 1;
        nextFlags.of = (newMsb !== (nextFlags.cf ? 1 : 0));
        changed.of = true;
      }
      changed.cf = true;
      explanation = `ROL: Rotate Left 0x${a.toString(16).toUpperCase()} by ${count} => 0x${result.toString(16).toUpperCase()}. CF=${nextFlags.cf ? 1 : 0}.`;
      break;
    }

    case 'ROR': {
      const count = b & 0x1F;
      let temp = a;
      for (let i = 0; i < count; i++) {
        const lsb = temp & 1;
        temp = (temp >>> 1) | (lsb << signBit);
        nextFlags.cf = lsb === 1;
      }
      result = temp & mask;
      if (count === 1) {
        const bit1 = (result >> signBit) & 1;
        const bit2 = (result >> (signBit - 1)) & 1;
        nextFlags.of = (bit1 !== bit2);
        changed.of = true;
      }
      changed.cf = true;
      explanation = `ROR: Rotate Right 0x${a.toString(16).toUpperCase()} by ${count} => 0x${result.toString(16).toUpperCase()}. CF=${nextFlags.cf ? 1 : 0}.`;
      break;
    }

    case 'RCL': {
      const count = b & 0x1F;
      let temp = a;
      let c = currentFlags.cf ? 1 : 0;
      for (let i = 0; i < count; i++) {
        const msb = (temp >> signBit) & 1;
        temp = ((temp << 1) & mask) | c;
        c = msb;
      }
      result = temp;
      nextFlags.cf = c === 1;
      if (count === 1) {
        const newMsb = (result >> signBit) & 1;
        nextFlags.of = (newMsb !== (nextFlags.cf ? 1 : 0));
        changed.of = true;
      }
      changed.cf = true;
      explanation = `RCL: Rotate through Carry Left by ${count} => 0x${result.toString(16).toUpperCase()}. CF=${nextFlags.cf ? 1 : 0}.`;
      break;
    }

    case 'RCR': {
      const count = b & 0x1F;
      let temp = a;
      let c = currentFlags.cf ? 1 : 0;
      for (let i = 0; i < count; i++) {
        const lsb = temp & 1;
        temp = (temp >>> 1) | (c << signBit);
        c = lsb;
      }
      result = temp & mask;
      nextFlags.cf = c === 1;
      if (count === 1) {
        const bit1 = (result >> signBit) & 1;
        const bit2 = (result >> (signBit - 1)) & 1;
        nextFlags.of = (bit1 !== bit2);
        changed.of = true;
      }
      changed.cf = true;
      explanation = `RCR: Rotate through Carry Right by ${count} => 0x${result.toString(16).toUpperCase()}. CF=${nextFlags.cf ? 1 : 0}.`;
      break;
    }

    case 'DAA': {
      // Decimal Adjust AL after Addition (BCD)
      let al = a & 0xFF;
      let cf = currentFlags.cf;
      let af = currentFlags.af;
      const oldAl = al;

      if ((al & 0x0F) > 9 || af) {
        al = (al + 6) & 0xFF;
        af = true;
      }
      if (oldAl > 0x99 || cf) {
        al = (al + 0x60) & 0xFF;
        cf = true;
      }
      result = al;
      nextFlags.cf = cf;
      nextFlags.af = af;
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & 0x80) !== 0;
      nextFlags.pf = calculateParity8(result);
      changed.cf = true;
      changed.af = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      explanation = `DAA: Decimal adjust AL (Packed BCD) => 0x${result.toString(16).toUpperCase().padStart(2, '0')}.`;
      break;
    }

    case 'DAS': {
      // Decimal Adjust AL after Subtraction (BCD)
      let al = a & 0xFF;
      let cf = currentFlags.cf;
      let af = currentFlags.af;
      const oldAl = al;

      if ((al & 0x0F) > 9 || af) {
        al = (al - 6) & 0xFF;
        af = true;
      }
      if (oldAl > 0x99 || cf) {
        al = (al - 0x60) & 0xFF;
        cf = true;
      }
      result = al;
      nextFlags.cf = cf;
      nextFlags.af = af;
      nextFlags.zf = result === 0;
      nextFlags.sf = (result & 0x80) !== 0;
      nextFlags.pf = calculateParity8(result);
      changed.cf = true;
      changed.af = true;
      changed.zf = true;
      changed.sf = true;
      changed.pf = true;
      explanation = `DAS: Decimal adjust AL after subtraction (Packed BCD) => 0x${result.toString(16).toUpperCase().padStart(2, '0')}.`;
      break;
    }

    case 'AAA': {
      // ASCII Adjust AL after Addition (Unpacked BCD)
      let al = a & 0xFF;
      let ah = (operandA >> 8) & 0xFF;
      let af = false;
      let cf = false;
      if ((al & 0x0F) > 9 || currentFlags.af) {
        al = (al + 6) & 0x0F;
        ah = (ah + 1) & 0xFF;
        af = true;
        cf = true;
      } else {
        al = al & 0x0F;
      }
      result = (ah << 8) | al;
      nextFlags.af = af;
      nextFlags.cf = cf;
      changed.af = true;
      changed.cf = true;
      explanation = `AAA: ASCII Adjust after Addition => AX=0x${result.toString(16).toUpperCase().padStart(4, '0')}.`;
      break;
    }

    case 'AAS': {
      // ASCII Adjust AL after Subtraction (Unpacked BCD)
      let al = a & 0xFF;
      let ah = (operandA >> 8) & 0xFF;
      let af = false;
      let cf = false;
      if ((al & 0x0F) > 9 || currentFlags.af) {
        al = (al - 6) & 0x0F;
        ah = (ah - 1) & 0xFF;
        af = true;
        cf = true;
      } else {
        al = al & 0x0F;
      }
      result = (ah << 8) | al;
      nextFlags.af = af;
      nextFlags.cf = cf;
      changed.af = true;
      changed.cf = true;
      explanation = `AAS: ASCII Adjust after Subtraction => AX=0x${result.toString(16).toUpperCase().padStart(4, '0')}.`;
      break;
    }

    case 'AAM': {
      // ASCII Adjust AX after Multiply (Unpacked BCD)
      const base = b > 0 ? (b & 0xFF) : 10;
      const al = a & 0xFF;
      const ah = Math.floor(al / base) & 0xFF;
      const newAl = (al % base) & 0xFF;
      result = (ah << 8) | newAl;
      nextFlags.sf = (newAl & 0x80) !== 0;
      nextFlags.zf = newAl === 0;
      nextFlags.pf = calculateParity8(newAl);
      changed.sf = true;
      changed.zf = true;
      changed.pf = true;
      explanation = `AAM: AH = AL / ${base} (${ah}), AL = AL % ${base} (${newAl}) => AX=0x${result.toString(16).toUpperCase().padStart(4, '0')}.`;
      break;
    }

    case 'AAD': {
      // ASCII Adjust AX before Division (Unpacked BCD)
      const base = b > 0 ? (b & 0xFF) : 10;
      const al = a & 0xFF;
      const ah = (operandA >> 8) & 0xFF;
      const newAl = ((ah * base) + al) & 0xFF;
      result = newAl; // AH becomes 0
      nextFlags.sf = (newAl & 0x80) !== 0;
      nextFlags.zf = newAl === 0;
      nextFlags.pf = calculateParity8(newAl);
      changed.sf = true;
      changed.zf = true;
      changed.pf = true;
      explanation = `AAD: AL = (AH * ${base}) + AL = ${newAl}, AH = 0 => AX=0x${result.toString(16).toUpperCase().padStart(4, '0')}.`;
      break;
    }

    case 'CBW': {
      // Convert Byte to Word: Sign extend AL into AH
      const al = a & 0xFF;
      const isNeg = (al & 0x80) !== 0;
      const ah = isNeg ? 0xFF : 0x00;
      result = (ah << 8) | al;
      explanation = `CBW: Sign-extended AL(0x${al.toString(16).toUpperCase()}) => AX(0x${result.toString(16).toUpperCase().padStart(4, '0')}).`;
      break;
    }

    case 'CWD': {
      // Convert Word to Doubleword: Sign extend AX into DX
      const ax = a & 0xFFFF;
      const isNeg = (ax & 0x8000) !== 0;
      const dx = isNeg ? 0xFFFF : 0x0000;
      result = ax;
      resultHigh = dx;
      explanation = `CWD: Sign-extended AX(0x${ax.toString(16).toUpperCase()}) => DX:AX (0x${dx.toString(16).toUpperCase()}:${ax.toString(16).toUpperCase()}).`;
      break;
    }
  }

  return {
    op,
    is16Bit,
    operandA: a,
    operandB: b,
    result,
    resultHigh,
    flags: nextFlags,
    flagsChanged: changed,
    explanation,
  };
}
